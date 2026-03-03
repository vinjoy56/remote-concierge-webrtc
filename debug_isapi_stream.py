# Test ISAPI Event Stream Connection
# This script will help debug what events the NVR is actually sending

import requests
from requests.auth import HTTPDigestAuth
import time

NVR_IP = '192.168.0.100'
USERNAME = 'admin'
PASSWORD = 'j408688271A'
URL = f"http://{NVR_IP}/ISAPI/Event/notification/alertStream"

print("=" * 60)
print("ISAPI Event Stream Debugger")
print("=" * 60)
print(f"Connecting to: {URL}")
print("This will show ALL events the NVR sends...")
print("Press Ctrl+C to stop")
print("=" * 60)
print()

auth = HTTPDigestAuth(USERNAME, PASSWORD)

try:
    response = requests.get(URL, auth=auth, stream=True, timeout=10)
    
    if response.status_code != 200:
        print(f"❌ ERROR: Status code {response.status_code}")
        print(f"Response: {response.text}")
        exit(1)
    
    print("✅ Connected successfully!")
    print("Waiting for events... (trigger motion on cameras now)")
    print()
    
    line_count = 0
    for line in response.iter_lines():
        if not line:
            continue
        
        line_count += 1
        decoded = line.decode('utf-8', errors='ignore')
        
        # Print every line to see raw data
        print(f"[{line_count}] {decoded}")
        
        # Highlight important lines
        if 'EventNotificationAlert' in decoded:
            print("    ^^^ 🔔 EVENT START")
        if 'eventType' in decoded:
            print("    ^^^ 📋 EVENT TYPE")
        if 'channelID' in decoded:
            print("    ^^^ 📹 CHANNEL ID")
        if 'VMD' in decoded:
            print("    ^^^ 🏃 MOTION DETECTED!")
        
except KeyboardInterrupt:
    print("\n\n👋 Stopped by user")
except Exception as e:
    print(f"\n❌ Error: {e}")
