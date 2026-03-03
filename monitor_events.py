# -*- coding: utf-8 -*-
import requests
from requests.auth import HTTPDigestAuth
import xml.etree.ElementTree as ET
import json
import sys
import time
import re

# NVR Configuration - Accept from command line or use defaults
if len(sys.argv) >= 4:
    NVR_IP = sys.argv[1]
    USERNAME = sys.argv[2]
    PASSWORD = sys.argv[3]
else:
    # Defaults for backward compatibility
    NVR_IP = '192.168.0.100'
    USERNAME = 'admin'
    PASSWORD = 'j408688271A'

URL = f"http://{NVR_IP}/ISAPI/Event/notification/alertStream"

def parse_event(xml_data):
    try:
        root = ET.fromstring(xml_data)
        # Handle namespaces if present (Hikvision usually returns plain XML in multipart, but good to be safe)
        # For simplicity, we'll strip namespaces in tag names if we use root.iter()
        
        event_type = None
        channel_id = None
        description = None
        target_type = None
        
        for elem in root.iter():
            tag = elem.tag.split('}')[-1] # Strip namespace
            if tag == 'eventType':
                event_type = elem.text
            elif tag == 'channelID' or tag == 'dynChannelID':
                channel_id = elem.text
            elif tag == 'eventDescription':
                description = elem.text
            elif tag == 'targetType':
                target_type = elem.text
                
        if event_type == 'VMD': # Video Motion Detection
            return {
                'type': 'motion',
                'channel': channel_id,
                'description': description or 'Motion Detected',
                'targetType': target_type  # 'human', 'vehicle', or None
            }
        elif event_type == 'videoloss':
             return {
                'type': 'videoloss',
                'channel': channel_id,
                'description': 'Video Loss Detected'
            }
        # Add other event types here as needed
        
        return None
        
    except ET.ParseError:
        return None

def main():
    # Force stdout to use utf-8 to avoid encoding errors on Windows
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')

    print(json.dumps({"status": "starting", "message": f"Connecting to {URL}..."}), flush=True)

    auth = HTTPDigestAuth(USERNAME, PASSWORD)
    
    while True:
        try:
            # stream=True is crucial for long-lived connections
            response = requests.get(URL, auth=auth, stream=True, timeout=60)
            
            if response.status_code != 200:
                print(json.dumps({"error": f"Status code {response.status_code}"}), flush=True)
                time.sleep(5)
                continue

            print(json.dumps({"status": "connected", "message": "Connected to event stream"}), flush=True)

            # Process the stream
            # The stream is multipart/mixed. We can read line by line or chunk by chunk.
            # Hikvision events are usually XML blocks separated by boundaries.
            
            xml_buffer = ""
            in_xml = False
            
            for line in response.iter_lines():
                if not line:
                    continue
                
                decoded_line = line.decode('utf-8', errors='ignore')
                
                # Simple state machine to capture XML blocks
                if '<EventNotificationAlert' in decoded_line:
                    in_xml = True
                    xml_buffer = decoded_line
                elif in_xml:
                    xml_buffer += decoded_line
                    if '</EventNotificationAlert>' in decoded_line:
                        in_xml = False
                        event_data = parse_event(xml_buffer)
                        if event_data:
                            print(json.dumps(event_data), flush=True)
                        xml_buffer = ""
                        
        except requests.exceptions.RequestException as e:
            print(json.dumps({"error": f"Connection error: {str(e)}"}), flush=True)
            time.sleep(5)
        except Exception as e:
            print(json.dumps({"error": f"Unexpected error: {str(e)}"}), flush=True)
            time.sleep(5)

if __name__ == "__main__":
    main()
