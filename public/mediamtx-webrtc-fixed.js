// MediaMTX WebRTC Connection Logic
// Replaces Janus Gateway with MediaMTX WHIP protocol

const streamingHandles = {}; // Deprecated, keeping for backwards compatibility
const pendingRequests = new Set();
const peerConnections = {}; // Store RTCPeerConnection instances

async function connectCamera(camId, streamName) {
    if (peerConnections[camId]) {
        console.log(`Camera ${camId} already connected`);
        return;
    }

    try {
        pendingRequests.add(camId);
        console.log(`Creating new RTCPeerConnection for ${camId}`);

        const pc = new RTCPeerConnection({
            iceServers: [], // No STUN for local testing
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle'
        });

        peerConnections[camId] = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`New ICE candidate for ${camId}:`, event.candidate.candidate);
            } else {
                console.log(`ICE gathering complete for ${camId}`);
            }
        };

        // Add transceiver for video
        pc.addTransceiver('video', { direction: 'recvonly' });

        // Improved track handler with better error handling and codec preference
        pc.ontrack = (event) => {
            console.log(`Track received for ${camId}`, event);
            const videoId = `mini-${camId.replace('cam', '')}`;
            const video = document.getElementById(videoId);
            
            if (video) {
                console.log(`Found video element for ${camId} (${videoId}):`, video);
                
                // Ensure video is properly configured
                video.playsInline = true;
                video.muted = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                
                if (event.streams && event.streams[0]) {
                    console.log(`Setting video srcObject from stream for ${camId}`);
                    video.srcObject = event.streams[0];
                } else {
                    console.log(`Creating new MediaStream for ${camId}`);
                    if (!video.srcObject) {
                        video.srcObject = new MediaStream();
                    }
                    video.srcObject.addTrack(event.track);
                }
                
                console.log(`Attached track to video element for ${camId}`);
                
                // Force play with better error handling
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error(`Play error for ${camId}:`, error);
                        // Try to force play with muted audio
                        video.muted = true;
                        video.play().catch(e => console.error(`Second play attempt failed:`, e));
                    });
                }
            } else {
                console.error(`Video element not found for ${camId} (looking for #${videoId})`);
                // Retry in case element isn't in DOM yet
                setTimeout(() => {
                    const retryVideo = document.getElementById(videoId);
                    if (retryVideo && event.streams && event.streams[0]) {
                        retryVideo.srcObject = event.streams[0];
                        retryVideo.play().catch(console.error);
                    }
                }, 500);
            }
        };
        
        // Function to set codec preferences
        function setCodecPreference(sdp, codec) {
            const lines = sdp.split('\n');
            const mLineIndex = lines.findIndex(line => line.startsWith('m=video'));
            if (mLineIndex === -1) return sdp;

            const codecIndex = lines.findIndex((line, index) => 
                index > mLineIndex && 
                line.includes('RTP/SAVPF') && 
                line.includes(codec)
            );

            if (codecIndex === -1) return sdp;

            const codecLine = lines[codecIndex];
            lines.splice(codecIndex, 1);
            lines.splice(mLineIndex + 1, 0, codecLine);

            return lines.join('\n');
        }

        pc.oniceconnectionstatechange = () => {
            console.log(`ICE state for ${camId}:`, pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                console.log(`Connection ${camId} failed or closed, cleaning up...`);
                cleanupCamera(camId);
            }
        };

        // Create offer with proper options
        const offer = await pc.createOffer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: false
        });
        
        // Set codec preference to H264 for better compatibility
        if (offer.sdp) {
            offer.sdp = setCodecPreference(offer.sdp, 'H264');
            console.log('Modified SDP with H264 preference:', offer.sdp);
        }
        
        await pc.setLocalDescription(offer);

        console.log(`Sending offer for ${camId} to MediaMTX...`);
        
        // MediaMTX WHIP endpoint with cache-busting parameter
        const whipEndpoint = `http://127.0.0.1:8889/${streamName}/whip?t=${Date.now()}`;
        console.log(`Sending offer to WHIP endpoint: ${whipEndpoint}`);
        
        try {
            const response = await fetch(whipEndpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/sdp',
                    'Accept': 'application/sdp'
                },
                body: offer.sdp
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('WHIP request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    headers: Object.fromEntries(response.headers.entries())
                });
                throw new Error(`WHIP request failed: ${response.status} - ${errorText}`);
            }

            const answer = await response.text();
            console.log(`Received answer for ${camId}:`, answer.substring(0, 100) + '...');
            
            // Clean up the SDP answer
            const cleanAnswer = answer.split('\r\n')
                .filter(line => !line.startsWith('a=extmap-allow-mixed'))
                .join('\r\n');
                
            console.log('Setting remote description with answer SDP');
            await pc.setRemoteDescription({ type: 'answer', sdp: cleanAnswer });

            console.log(`✅ Camera ${camId} connected via MediaMTX`);
            pendingRequests.delete(camId);

        } catch (error) {
            console.error(`Failed to connect camera ${camId}:`, error);
            cleanupCamera(camId);
            pendingRequests.delete(camId);
            throw error; // Re-throw to allow caller to handle the error
        }
    } catch (error) {
        console.error(`Error in connectCamera for ${camId}:`, error);
        cleanupCamera(camId);
        throw error;
    }
}

function cleanupCamera(camId) {
    if (peerConnections[camId]) {
        peerConnections[camId].close();
        delete peerConnections[camId];
    }
    const video = document.getElementById(`mini-${camId}`);
    if (video) {
        video.srcObject = null;
    }
}

function requestStream(camId) {
    // camId is already cam1, cam2, cam3 which matches mediamtx.yml paths
    connectCamera(camId, camId);
}
