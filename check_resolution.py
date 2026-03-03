# -*- coding: utf-8 -*-
import subprocess
import sys
import re

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

NVR_IP = "192.168.0.101"
USER = "admin"
PASS = "j408688271A"

# Test a few analog channels
channels = [1, 2, 3] 

print("=" * 70)
print("ANALIZANDO RESOLUCIÓN DE CÁMARAS ANALÓGICAS NVR #2")
print("=" * 70)

for ch in channels:
    stream_id = f"{ch}01" # Mainstream
    url = f"rtsp://{USER}:{PASS}@{NVR_IP}:554/Streaming/Channels/{stream_id}"
    
    print(f"\n📡 Analizando Cámara {ch} (Stream {stream_id})...")
    
    cmd = [
        'ffprobe', 
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,codec_name,avg_frame_rate,profile',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        url
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        output = result.stdout.strip().split('\n')
        
        if result.returncode == 0 and output:
            print(f"   ✅ Codec:      {output[0] if len(output) > 0 else 'N/A'}")
            # ffprobe output order depends on entries, usually width, height come together if requested
            # Let's parse generic output if needed, but usually it respects order
            # Better format: key=value
            
            # Re-run with key=1 for safer parsing
            cmd2 = cmd[:]
            cmd2[7] = 'default=noprint_wrappers=1' # keep keys
            res2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=10)
            
            details = {}
            for line in res2.stdout.strip().split('\n'):
                if '=' in line:
                    k, v = line.split('=')
                    details[k] = v
            
            w = int(details.get('width', 0))
            h = int(details.get('height', 0))
            codec = details.get('codec_name', 'Unknown')
            profile = details.get('profile', 'Unknown')
            
            print(f"   📏 Resolución: {w}x{h}")
            print(f"   🎞️  Codec:      {codec} ({profile})")
            
            ratio = w/h if h > 0 else 0
            if 1.3 < ratio < 1.4:
                print("   📺 Aspecto:    4:3 (Formato cuadrado/antiguo)")
            elif 1.7 < ratio < 1.8:
                print("   📺 Aspecto:    16:9 (Widescreen)")
                
            if w < 1280:
                print("   ⚠️  Calidad:    BAJA (Menor a HD 720p)")
            elif w >= 1920:
                print("   ✨ Calidad:    FULL HD (1080p)")
            else:
                print("   ✔️  Calidad:    HD (720p)")
                
        else:
            print("   ❌ Error leyendo stream")
    except FileNotFoundError:
        print("   ❌ Error: ffprobe no encontrado en el sistema")
        break
    except Exception as e:
        print(f"   ❌ Error: {e}")

print("\n" + "=" * 70)
