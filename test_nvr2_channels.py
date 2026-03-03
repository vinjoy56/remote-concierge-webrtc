# -*- coding: utf-8 -*-
import subprocess
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

NVR_IP = "192.168.0.101"
USER = "admin"
PASS = "j408688271A"

# Test channels 1-10
channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

print("=" * 70)
print("PROBANDO CONECTIVIDAD DE CANALES NVR #2")
print("=" * 70)
print(f"\nNVR: {NVR_IP}\n")

for ch in channels:
    substream_id = f"{ch}02"
    mainstream_id = f"{ch}01"
    
    url_sub = f"rtsp://{USER}:{PASS}@{NVR_IP}:554/Streaming/Channels/{substream_id}"
    url_main = f"rtsp://{USER}:{PASS}@{NVR_IP}:554/Streaming/Channels/{mainstream_id}"
    
    print(f"\nCanal {ch}:")
    print(f"  Substream:  {substream_id}")
    print(f"  Mainstream: {mainstream_id}")
    
    # Test with ffprobe (if available)
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name', '-of', 'default=noprint_wrappers=1:no key=1', url_sub],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print(f"  ✅ Stream OK")
        else:
            print(f"  ❌ No disponible")
    except:
        print(f"  ⚠️  ffprobe no disponible - usar MediaMTX para probar")

print("\n" + "=" * 70)
print("Para identificar cada cámara, consulta la interfaz web del NVR")
print("o conecta con iVMS-4200 para ver los nombres asignados.")
print("=" * 70)
