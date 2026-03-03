# -*- coding: utf-8 -*-
import subprocess
import sys
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# NVR Configurations
NVRS = [
    {
        'name': 'NVR #1',
        'ip': '192.168.0.100',
        'user': 'admin',
        'pass': 'j408688271A',
        'analog_channels': list(range(1, 32))  # Channels 1-31
    },
    {
        'name': 'NVR #2',
        'ip': '192.168.0.101',
        'user': 'admin',
        'pass': 'j408688271A',
        'analog_channels': list(range(1, 11))  # Channels 1-10
    }
]

def test_stream(nvr_name, nvr_ip, user, password, channel):
    """Test if a specific RTSP stream is active and has video"""
    stream_id = f"{channel}01"  # Main stream (X01)
    url = f"rtsp://{user}:{password}@{nvr_ip}:554/Streaming/Channels/{stream_id}"
    
    # Use ffprobe to check stream
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,codec_name',
        '-of', 'json',
        '-rtsp_transport', 'tcp',
        '-timeout', '5000000',  # 5 second timeout
        url
    ]
    
    try:
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout:
            # Parse JSON output
            data = json.loads(result.stdout)
            if 'streams' in data and len(data['streams']) > 0:
                stream_info = data['streams'][0]
                width = stream_info.get('width', 0)
                height = stream_info.get('height', 0)
                codec = stream_info.get('codec_name', 'unknown')
                
                if width > 0 and height > 0:
                    return {
                        'channel': channel,
                        'stream_id': stream_id,
                        'status': 'ACTIVE',
                        'resolution': f"{width}x{height}",
                        'codec': codec,
                        'url': url.replace(password, '***')
                    }
        
        return {
            'channel': channel,
            'stream_id': stream_id,
            'status': 'NO_VIDEO',
            'error': 'No video stream detected',
            'url': url.replace(password, '***')
        }
        
    except subprocess.TimeoutExpired:
        return {
            'channel': channel,
            'stream_id': stream_id,
            'status': 'TIMEOUT',
            'error': 'Connection timeout',
            'url': url.replace(password, '***')
        }
    except Exception as e:
        return {
            'channel': channel,
            'stream_id': stream_id,
            'status': 'ERROR',
            'error': str(e),
            'url': url.replace(password, '***')
        }

def main():
    print("="*70)
    print("VERIFICACION DE CAMARAS ANALOGICAS")
    print("="*70)
    print("\nProbando streams RTSP... (esto puede tomar varios minutos)\n")
    
    all_results = {}
    
    for nvr in NVRS:
        print(f"\n{'='*70}")
        print(f" {nvr['name']} ({nvr['ip']})")
        print(f"{'='*70}\n")
        
        results = []
        
        # Test streams in parallel (max 5 at a time to avoid overwhelming the NVR)
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(
                    test_stream,
                    nvr['name'],
                    nvr['ip'],
                    nvr['user'],
                    nvr['pass'],
                    ch
                ): ch for ch in nvr['analog_channels']
            }
            
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                
                # Print progress
                status_icon = "✅" if result['status'] == 'ACTIVE' else "❌"
                print(f"{status_icon} Canal {result['channel']:2d}: {result['status']:10s} ", end='')
                
                if result['status'] == 'ACTIVE':
                    print(f"({result['resolution']}, {result['codec']})")
                elif 'error' in result:
                    print(f"- {result['error']}")
                else:
                    print()
        
        # Sort by channel number
        results.sort(key=lambda x: x['channel'])
        all_results[nvr['name']] = results
        
        # Summary for this NVR
        active_count = sum(1 for r in results if r['status'] == 'ACTIVE')
        print(f"\nResumen {nvr['name']}: {active_count}/{len(results)} cámaras activas")
    
    # Generate final report
    print("\n" + "="*70)
    print("RESUMEN FINAL")
    print("="*70)
    
    total_active = 0
    total_tested = 0
    
    for nvr_name, results in all_results.items():
        active = [r for r in results if r['status'] == 'ACTIVE']
        total_active += len(active)
        total_tested += len(results)
        
        print(f"\n{nvr_name}:")
        if active:
            print(f"  Cámaras Activas ({len(active)}):")
            for cam in active:
                print(f"    - Canal {cam['channel']:2d} ({cam['stream_id']}): {cam['resolution']} {cam['codec']}")
        else:
            print("  ⚠️  No se encontraron cámaras activas")
    
    print(f"\n{'='*70}")
    print(f"TOTAL: {total_active}/{total_tested} cámaras analógicas funcionando")
    print(f"{'='*70}\n")
    
    # Save detailed report to JSON
    with open('camera_verification_report.json', 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print("📄 Reporte detallado guardado en: camera_verification_report.json\n")

if __name__ == "__main__":
    main()
