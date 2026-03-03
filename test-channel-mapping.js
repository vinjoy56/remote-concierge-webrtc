// Test script to verify channel mapping
const config = require('./config.json');

console.log('=== Channel Mapping Test ===\n');

// Test channels from your NVR
const testChannels = [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 48, 49];

function findCameraByLogicalId(logicalId, metadata) {
    const parsed = parseInt(logicalId);
    for (const [camId, data] of Object.entries(metadata)) {
        if (data.logicalId === parsed) {
            return camId;
        }
    }
    return null;
}

testChannels.forEach(channel => {
    const camId = findCameraByLogicalId(channel, config.cameras.metadata);
    const cameraName = camId ? config.cameras.metadata[camId].name : 'NOT FOUND';
    console.log(`NVR Channel ${channel} -> ${camId || 'null'} (${cameraName})`);
});

console.log('\n=== All Cameras in Config ===\n');
Object.entries(config.cameras.metadata).forEach(([camId, data]) => {
    console.log(`${camId}: logicalId=${data.logicalId}, name="${data.name}"`);
});
