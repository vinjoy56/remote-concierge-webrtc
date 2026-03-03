// MediaMTX WebRTC Connection Logic
// Replaces Janus Gateway with MediaMTX WHIP protocol

const streamingHandles = {}; // Deprecated, keeping for backwards compatibility
const pendingRequests = new Set();
const peerConnections = {}; // Store RTCPeerConnection instances

let cachedIceServers = null;

async function getIceServers() {
    if (cachedIceServers) return cachedIceServers;

    const fallback = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ];

    try {
        // Use session-based auth (cookies)
        const res = await fetch('/api/webrtc-config', { credentials: 'same-origin' });

        if (!res.ok) {
            cachedIceServers = fallback;
            return cachedIceServers;
        }

        const data = await res.json();
        if (data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
            cachedIceServers = data.iceServers;
            return cachedIceServers;
        }
    } catch (e) {
        // ignore and fallback
    }

    cachedIceServers = fallback;
    return cachedIceServers;
}

function waitForIceGatheringComplete(pc, timeoutMs = 2000) {
    if (pc.iceGatheringState === 'complete') {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        let done = false;

        const finish = () => {
            if (done) return;
            done = true;
            pc.removeEventListener('icegatheringstatechange', onStateChange);
            clearTimeout(timer);
            resolve();
        };

        const onStateChange = () => {
            if (pc.iceGatheringState === 'complete') {
                finish();
            }
        };

        pc.addEventListener('icegatheringstatechange', onStateChange);
        const timer = setTimeout(finish, timeoutMs);
    });
}

function startInboundStatsLogging(pc, camId) {
    let lastBytes = 0;
    let lastTs = 0;
    let warnedNoVideo = false;
    let loggedSelectedPair = false;

    const poll = async () => {
        if (pc.connectionState === 'closed' || pc.iceConnectionState === 'closed') {
            return false;
        }

        try {
            const stats = await pc.getStats();

            if (!loggedSelectedPair) {
                // Try to find selected candidate pair and print its details
                for (const report of stats.values()) {
                    if (report.type === 'candidate-pair' && (report.selected || report.nominated) && report.state === 'succeeded') {
                        const local = stats.get(report.localCandidateId);
                        const remote = stats.get(report.remoteCandidateId);
                        console.log(`[${camId}] selected candidate-pair:`, {
                            pairState: report.state,
                            local: local ? {
                                candidateType: local.candidateType,
                                address: local.address,
                                port: local.port,
                                protocol: local.protocol,
                                url: local.url
                            } : null,
                            remote: remote ? {
                                candidateType: remote.candidateType,
                                address: remote.address,
                                port: remote.port,
                                protocol: remote.protocol,
                                url: remote.url
                            } : null
                        });
                        loggedSelectedPair = true;
                        break;
                    }
                }
            }

            let sawInboundVideo = false;
            for (const report of stats.values()) {
                const mediaKind = report.kind || report.mediaType;
                if (report.type === 'inbound-rtp' && mediaKind === 'video') {
                    const bytes = report.bytesReceived || 0;
                    const ts = report.timestamp || 0;
                    if (lastTs && ts > lastTs) {
                        const deltaBytes = bytes - lastBytes;
                        const deltaSec = (ts - lastTs) / 1000;
                        const kbps = deltaSec > 0 ? (deltaBytes * 8) / 1000 / deltaSec : 0;
                        console.log(`[${camId}] inbound video: bytes=${bytes} framesDecoded=${report.framesDecoded ?? 'n/a'} fps=${report.framesPerSecond ?? 'n/a'} kbps=${kbps.toFixed(1)}`);
                    } else {
                        console.log(`[${camId}] inbound video: bytes=${bytes} framesDecoded=${report.framesDecoded ?? 'n/a'} fps=${report.framesPerSecond ?? 'n/a'}`);
                    }
                    lastBytes = bytes;
                    lastTs = ts;
                    sawInboundVideo = true;
                    break;
                }
            }

            if (!sawInboundVideo) {
                for (const report of stats.values()) {
                    const mediaKind = report.kind || report.mediaType;
                    if (report.type === 'track' && mediaKind === 'video') {
                        console.log(`[${camId}] track stats: framesDecoded=${report.framesDecoded ?? 'n/a'} framesReceived=${report.framesReceived ?? 'n/a'} frameWidth=${report.frameWidth ?? 'n/a'} frameHeight=${report.frameHeight ?? 'n/a'}`);
                        sawInboundVideo = true;
                        break;
                    }
                }
            }

            if (!sawInboundVideo && !warnedNoVideo) {
                warnedNoVideo = true;
                console.warn(`[${camId}] No inbound video stats found (no inbound-rtp/track video reports).`);
            }
        } catch (e) {
            console.warn(`[${camId}] getStats failed:`, e);
        }

        return true;
    };

    // run immediately once
    poll();

    const interval = setInterval(async () => {
        const ok = await poll();
        if (!ok) clearInterval(interval);
    }, 1000);
}

// Modified to support custom stream names and target video elements
async function connectCamera(camId, streamName, targetVideoId = null) {
    if (peerConnections[camId]) {
        console.log(`Connection for ${camId} already exists`);
        return;
    }

    try {
        pendingRequests.add(camId);
        console.log(`Creating new RTCPeerConnection for ${camId} (stream: ${streamName})`);

        const iceServers = await getIceServers();
        // ... (ice servers log)

        const pc = new RTCPeerConnection({
            iceServers,
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle'
        });

        peerConnections[camId] = pc;

        // ... (ICE candidate handling logic remains same)
        const candidateTypeCounts = { host: 0, srflx: 0, relay: 0, prflx: 0, unknown: 0 };
        let sawMdns = false;
        const mdnsRewriteMap = new Map();

        pc.onicecandidateerror = (event) => {
            // ... error logging
            console.warn(`ICE candidate error for ${camId}:`, event.errorCode);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                // ... same candidate logic
                const c = event.candidate.candidate || '';
                if (/\.local\b/i.test(c)) sawMdns = true;
                // ... logic
            } else {
                // ... gathering complete logic
            }
        };

        // Add transceiver for video
        pc.addTransceiver('video', { direction: 'recvonly' });

        // Improved track handler
        pc.ontrack = (event) => {
            console.log(`Track received for ${camId}`, event);

            // Determine video element: usage custom target OR default mini-X
            let video = null;
            if (targetVideoId) {
                video = document.getElementById(targetVideoId);
            } else {
                const videoId = `mini-${camId.replace('cam', '')}`;
                video = document.getElementById(videoId);
            }

            if (video) {
                console.log(`Found video element for ${camId}:`, video.id);

                video.playsInline = true;
                video.muted = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');

                if (event.streams && event.streams[0]) {
                    video.srcObject = event.streams[0];
                } else {
                    if (!video.srcObject) video.srcObject = new MediaStream();
                    video.srcObject.addTrack(event.track);
                }

                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        updateCameraStatus(camId, 'playing');
                    }).catch(error => {
                        console.error(`Play error for ${camId}:`, error);
                        video.muted = true;
                        video.play().then(() => {
                            updateCameraStatus(camId, 'playing');
                        }).catch(e => console.error(`Second play attempt failed:`, e));
                    });
                }
            } else {
                console.error(`Video element not found for ${camId}`);
            }
        };

        // ... (Codec preference logic remains same)
        function setCodecPreference(sdp, codec) {
            const lines = sdp.split('\n');
            const mLineIndex = lines.findIndex(line => line.startsWith('m=video'));
            if (mLineIndex === -1) return sdp;
            const codecIndex = lines.findIndex((line, index) => index > mLineIndex && line.includes('RTP/SAVPF') && line.includes(codec));
            if (codecIndex === -1) return sdp;
            const codecLine = lines[codecIndex];
            lines.splice(codecIndex, 1);
            lines.splice(mLineIndex + 1, 0, codecLine);
            return lines.join('\n');
        }

        pc.oniceconnectionstatechange = () => {
            // ... state change logic
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                cleanupCamera(camId);
            }
        };

        // Create offer
        const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: false });
        // ... set codec preference
        if (offer.sdp) offer.sdp = setCodecPreference(offer.sdp, 'H264');

        await pc.setLocalDescription(offer);
        await waitForIceGatheringComplete(pc, 2500);

        // ... (SDP cleanup logic same as before)
        let localSdp = pc.localDescription?.sdp || offer.sdp;

        // ... (WHEP request logic)
        const whepEndpoint = `/api/proxy-whep/${streamName}`;
        // NOTE: We should use the proxy if available or direct
        // For simplicity let's stick to direct localhost if in dev, but robust path is usually via proxy or direct URL
        // Original was: const whepEndpoint = \`http://127.0.0.1:8889/\${streamName}/whep\`;
        // Since we are in browser, we need absolute URL or relative if proxied.
        // Let's assume direct 8889 access for now based on previous code
        const directWhep = `http://localhost:8889/${streamName}/whep`;

        console.log(`Sending offer for ${camId} to ${directWhep}`);

        // Indicate loading state
        updateCameraStatus(camId, 'loading');

        try {
            const response = await fetch(directWhep, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: localSdp
            });

            if (!response.ok) {
                // Handle specific HTTP errors
                if (response.status === 404) {
                    throw new Error(`Stream not found (404)`);
                } else if (response.status === 503) {
                    throw new Error(`Stream unavailable (503)`);
                }
                throw new Error(`WHEP request failed: ${response.status}`);
            }

            const answer = await response.text();
            // ... set remote description
            const cleanAnswer = answer.split('\r\n').filter(line => !line.startsWith('a=extmap-allow-mixed')).join('\r\n');
            await pc.setRemoteDescription({ type: 'answer', sdp: cleanAnswer });

            startInboundStatsLogging(pc, camId);
            pendingRequests.delete(camId);

        } catch (error) {
            console.error(`Failed WHEP for ${camId}:`, error);
            cleanupCamera(camId);
            pendingRequests.delete(camId);

            // Show appropriate error message
            if (error.message.includes('404')) {
                updateCameraStatus(camId, 'offline', 'Cámara desconectada');
            } else {
                updateCameraStatus(camId, 'error', 'Error de conexión');
            }
            throw error;
        }

    } catch (error) {
        console.error(`Failed to connect camera ${camId}:`, error);
        cleanupCamera(camId);
        pendingRequests.delete(camId);
        updateCameraStatus(camId, 'error', 'Error al iniciar');
        throw error;
    }
}

function cleanupCamera(camId) {
    if (peerConnections[camId]) {
        peerConnections[camId].close();
        delete peerConnections[camId];
    }
    // We don't nullify srcObject here strictly because it might flicker, 
    // but usually cleaner to let the caller handle UI changes if needed.
    // However, existing logic does:
    const videoId = `mini-${camId.replace('cam', '')}`;
    const video = document.getElementById(videoId);
    if (video) video.srcObject = null;
}

function requestStream(camId) {
    // Default grid behavior
    connectCamera(camId, camId, null);
}

// Expose for external use
window.connectCamera = connectCamera;
window.cleanupCamera = cleanupCamera;
window.peerConnections = peerConnections; // Expose peerConnections for debugging/advanced usage

window.cleanupAllCameras = function () {
    console.log('Cleaning up ALL cameras...');
    Object.keys(peerConnections).forEach(id => {
        cleanupCamera(id);
    });
};

// === VIEWPORT-BASED LAZY LOADING ===
// Only load streams for cameras visible in viewport
// This prevents browser overload from 16 simultaneous WebRTC connections

let cameraObserver = null;

function setupCameraObserver() {
    // Disconnect existing observer if any
    if (cameraObserver) {
        cameraObserver.disconnect();
    }

    // Create observer with 200px margin (load slightly before entering viewport)
    cameraObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const camId = entry.target.dataset.camId;
            if (!camId) return;

            const fullCamId = `cam${camId}`;
            const isExpanded = !document.getElementById('expandedView').classList.contains('hidden');

            if (entry.isIntersecting) {
                // Camera is visible - start stream if not already connected and not in expanded mode
                if (!peerConnections[fullCamId] && !pendingRequests.has(fullCamId) && !isExpanded) {
                    console.log(`[Lazy] ${fullCamId} entered viewport, starting stream`);
                    connectCamera(fullCamId, fullCamId, null).catch(e =>
                        console.error(`[Lazy] Failed to start ${fullCamId}:`, e)
                    );
                }
            } else {
                // Camera is not visible - aggressively cleanup offscreen cameras to save resources
                // Add a small delay to avoid flickering if scrolling quickly past/back
                if (peerConnections[fullCamId]) {
                    // Use a timeout to ensure we don't kill it if user scrolls back immediately
                    // But for now, direct cleanup is safer to prevent overload
                    console.log(`[Lazy] ${fullCamId} left viewport, stopping stream`);
                    cleanupCamera(fullCamId);
                }
            }
        });
    }, {
        root: null, // viewport
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.1 // Trigger when 10% visible
    });

    // Observe all camera cards
    document.querySelectorAll('.camera-card').forEach(card => {
        cameraObserver.observe(card);
    });

    console.log(`[Lazy Loading] Observing ${document.querySelectorAll('.camera-card').length} cameras`);
}

// Helper to update camera status UI
function updateCameraStatus(camId, status, message = '') {
    const videoId = `mini-${camId.replace('cam', '')}`;
    const video = document.getElementById(videoId);
    if (!video) return;

    const container = video.parentElement;
    if (!container) return;

    // Check if overlay exists, if not create it
    let overlay = container.querySelector('.camera-status-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'camera-status-overlay';
        overlay.innerHTML = `
            <i class="fas fa-circle-notch fa-spin status-icon"></i>
            <div class="status-text">Cargando...</div>
            <div class="status-subtext"></div>
        `;
        container.appendChild(overlay);
        // Ensure container has relative position
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
    }

    const icon = overlay.querySelector('.status-icon');
    const text = overlay.querySelector('.status-text');
    const subtext = overlay.querySelector('.status-subtext');

    overlay.classList.remove('hidden', 'status-loading', 'status-offline', 'status-error');

    if (status === 'playing') {
        overlay.classList.add('hidden');
        return;
    }

    if (status === 'loading') {
        overlay.classList.add('status-loading');
        icon.className = 'fas fa-circle-notch fa-spin status-icon';
        text.textContent = 'Conectando...';
        subtext.textContent = '';
    } else if (status === 'offline') {
        overlay.classList.add('status-offline');
        icon.className = 'fas fa-video-slash status-icon';
        text.textContent = message || 'Offline';
        subtext.textContent = 'Sin señal';
    } else if (status === 'error') {
        overlay.classList.add('status-error');
        icon.className = 'fas fa-exclamation-triangle status-icon';
        text.textContent = message || 'Error';
        subtext.textContent = 'Reintentando...';
    }
}

// Expose for external use
window.setupCameraObserver = setupCameraObserver;

