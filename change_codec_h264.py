import requests
from requests.auth import HTTPDigestAuth
import xml.etree.ElementTree as ET
import sys

# Config
NVR_IP = '192.168.0.101'
USER = 'admin'
PASS = 'j408688271A'
CHANNEL = '101' # Mainstream Channel 1

url = f"http://{NVR_IP}/ISAPI/Streaming/channels/{CHANNEL}"
auth = HTTPDigestAuth(USER, PASS)

# 1. Construct minimal XML for PUT
# We use the exact namespace and structure required
payload = """<?xml version="1.0" encoding="UTF-8"?>
<StreamingChannel version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
    <id>101</id>
    <Video>
        <videoCodecType>H.264</videoCodecType>
    </Video>
</StreamingChannel>
"""

print("INFO: Enviando solicitud de cambio a H.264...")

headers = {'Content-Type': 'application/xml'}
try:
    put_resp = requests.put(url, data=payload, auth=auth, headers=headers)
    
    if put_resp.status_code == 200:
        print("EXITO: Codec cambiado a H.264")
        print(put_resp.text)
    else:
        print(f"ERROR PUT: {put_resp.status_code}")
        print(put_resp.text)

except Exception as e:
    print(f"EXCEPCION: {e}")
