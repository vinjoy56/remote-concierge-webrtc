// Test script to verify endpoints work
const http = require('http');

function testEndpoint(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: {
                'Cookie': '' // Without cookie, should fail if auth is required
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`\n=== ${path} ===`);
                console.log(`Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`Data type: ${Array.isArray(json) ? 'Array' : 'Object'}`);
                        console.log(`Items: ${Array.isArray(json) ? json.length : Object.keys(json).length}`);
                    } catch (e) {
                        console.log('Response:', data.substring(0, 200));
                    }
                } else {
                    console.log('Response:', data);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`ERROR testing ${path}:`, e.message);
            resolve();
        });

        req.end();
    });
}

async function runTests() {
    console.log('Testing API endpoints...\n');
    await testEndpoint('/api/residents');
    await testEndpoint('/api/devices');
    await testEndpoint('/api/config');
    console.log('\n✅ Tests complete');
}

runTests();
