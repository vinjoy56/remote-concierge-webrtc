import requests
from requests.auth import HTTPDigestAuth
import xml.etree.ElementTree as ET
import io
import time

# Config
NVR_IP = '192.168.0.101'
USER = 'admin'
PASS = 'j408688271A'
auth = HTTPDigestAuth(USER, PASS)

CHANNELS = [
    '201', '301', '401', '501', '601', 
    '701', '801', '901', '1001'
]

print("="*60)
print("INICIANDO CAMBIO MASIVO A H.264 (Canales 2-10)")
print("="*60)

for channel_id in CHANNELS:
    print(f"\nINFO: Procesando Canal {channel_id}...")
    url = f"http://{NVR_IP}/ISAPI/Streaming/channels/{channel_id}"
    
    try:
        # 1. GET
        resp = requests.get(url, auth=auth, timeout=10)
        if resp.status_code != 200:
            print(f"ERROR GET {channel_id}: {resp.status_code}")
            continue

        xml_content = resp.text
        # Registrar namespace para evitar prefijos ns0
        try:
            ET.register_namespace('', "http://www.hikvision.com/ver20/XMLSchema")
        except:
            pass
            
        root = ET.fromstring(xml_content)
        ns = {'ns': 'http://www.hikvision.com/ver20/XMLSchema'}

        # 2. FIND & MODIFY
        codec_node = root.find('.//ns:videoCodecType', ns)
        if codec_node is not None:
            current_codec = codec_node.text
            print(f"   Codec actual: {current_codec}")
            
            if current_codec == 'H.264':
                print("   OK: Ya es H.264. Saltando.")
                continue
                
            print("   ACTION: Cambiando a H.264...")
            codec_node.text = 'H.264'
            
            # 3. SERIALIZE & PUT
            f_out = io.BytesIO()
            tree = ET.ElementTree(root)
            tree.write(f_out, encoding='UTF-8', xml_declaration=True)
            new_xml = f_out.getvalue()
            
            headers = {'Content-Type': 'application/xml'}
            put_resp = requests.put(url, data=new_xml, auth=auth, headers=headers, timeout=10)
            
            if put_resp.status_code == 200:
                print(f"   EXITO: Canal {channel_id} actualizado.")
            else:
                print(f"   ERROR PUT: {put_resp.status_code} - {put_resp.text}")
        else:
            print("   ERROR: No se encontro videoCodecType")
            
    except Exception as e:
        print(f"   EXCEPCION: {e}")
    
    # Pausa breve para no saturar al NVR
    time.sleep(1)

print("\n" + "="*60)
print("PROCESO TERMINADO")
