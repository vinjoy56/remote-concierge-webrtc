import requests
from requests.auth import HTTPDigestAuth
import xml.etree.ElementTree as ET

# Config
NVR_IP = '192.168.0.101'
USER = 'admin'
PASS = 'j408688271A'
CHANNEL = '101'

url = f"http://{NVR_IP}/ISAPI/Streaming/channels/{CHANNEL}"
auth = HTTPDigestAuth(USER, PASS)

print(f"INFO: Leyendo config de {url}...")
resp = requests.get(url, auth=auth)
print(resp.text)
