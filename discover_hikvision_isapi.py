# -*- coding: utf-8 -*-
"""
Script para descubrir URLs de streaming RTSP del NVR Hikvision
usando peticiones HTTP directas a la API ISAPI
"""

import sys
import requests
from requests.auth import HTTPDigestAuth
import xml.etree.ElementTree as ET

# Fix encoding para Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Configuración del NVR (con argumentos de línea de comandos)
if len(sys.argv) >= 4:
    NVR_IP = sys.argv[1]
    USERNAME = sys.argv[2]
    PASSWORD = sys.argv[3]
else:
    # Valores por defecto
    NVR_IP = '192.168.0.100'
    USERNAME = 'admin'
    PASSWORD = 'j408688271A'
    print("⚠️  Usando valores por defecto. Uso: python script.py <IP> <USER> <PASS>\n")

def discover_hikvision_channels():
    """Descubre canales de streaming usando Hikvision ISAPI"""
    
    print("=" * 70)
    print("DESCUBRIMIENTO DE CANALES H IKVISION via ISAPI")
    print("=" * 70)
    print(f"\nNVR IP: {NVR_IP}")
    print(f"Usuario: {USERNAME}\n")
    
    auth = HTTPDigestAuth(USERNAME, PASSWORD)
    base_url = f"http://{NVR_IP}"
    
    # Intentar diferentes endpoints ISAPI comunes
    endpoints = [
        "/ISAPI/Streaming/channels",
        "/ISAPI/System/deviceInfo",
        "/ISAPI/ContentMgmt/InputProxy/channels"
    ]
    
    print("Intentando descubrir endpoints ISAPI...")
    print("-" * 70)
    
    for endpoint in endpoints:
        url = base_url + endpoint
        try:
            print(f"\n🔍 Probando: {endpoint}")
            response = requests.get(url, auth=auth, timeout=5)
            
            if response.status_code == 200:
                print(f"   ✅ Respuesta exitosa (200 OK)")
                
                # Intentar parsear XML
                try:
                    root = ET.fromstring(response.content)
                    print(f"   📄 XML válido recibido")
                    
                    # Debug: mostrar estructura XML
                    if "channels" in endpoint.lower():
                        print(f"\n   🔍 Analizando estructura del XML...")
                        
                        # Intentar diferentes namespaces
                        namespaces = {
                            '': '',
                            'ns': 'http://www.hikvision.com/ver20/XMLSchema',
                            'ns2': 'http://www.isapi.org/ver20/XMLSchema'
                        }
                        
                        # Buscar todos los elementos que puedan ser canales
                        channels_found = False
                        
                        # Buscar recursivamente todos los elementos
                        for elem in root.iter():
                            tag = elem.tag.split('}')[-1]  # Quitar namespace
                            
                            if 'Channel' in tag or 'channel' in tag:
                                channels_found = True
                                print(f"\n      📹 Elemento encontrado: {tag}")
                                
                                # Mostrar todos los subelementos
                                for child in elem:
                                    child_tag = child.tag.split('}')[-1]
                                    child_text = child.text if child.text else ""
                                    print(f"         {child_tag}: {child_text}")
                                    
                                    # Si encontramos un ID, construir URL RTSP
                                    if child_tag.lower() == 'id' and child_text:
                                        rtsp_url = f"rtsp://{USERNAME}:***@{NVR_IP}:554/Streaming/Channels/{child_text}"
                                        print(f"         🔗 RTSP: {rtsp_url}")
                        
                        if not channels_found:
                            # Mostrar el XML raw para debug
                            print(f"\n   ⚠️  No se encontraron elementos 'Channel'")
                            print(f"   📋 Primeros 500 caracteres del XML:")
                            xml_str = response.text[:500]
                            print(f"   {xml_str}")
                    
                    # Si es deviceInfo, mostrar información del dispositivo
                    elif "deviceInfo" in endpoint:
                        print(f"\n   ℹ️  INFORMACIÓN DEL DISPOSITIVO:")
                        for elem in root.iter():
                            tag = elem.tag.split('}')[-1]
                            if elem.text and tag in ['deviceName', 'model', 'serialNumber', 'firmwareVersion']:
                                print(f"      {tag}: {elem.text}")
                            
                except ET.ParseError:
                    print(f"   ⚠️  Respuesta no es XML válido")
                    print(f"   Primeros 200 caracteres: {response.text[:200]}")
                    
            elif response.status_code == 404:
                print(f"   ❌ 404 Not Found - Endpoint no disponible")
            elif response.status_code == 401:
                print(f"   ❌ 401 Unauthorized - Credenciales incorrectas")
            elif response.status_code == 403:
                print(f"   ❌ 403 Forbidden - Sin permisos para este endpoint")
            else:
                print(f"   ⚠️  Código: {response.status_code}")
                
        except requests.exceptions.Timeout:
            print(f"   ❌ Timeout - No hay respuesta")
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Error de conexión - No se puede alcanzar {NVR_IP}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Probar URLs RTSP comunes de Hikvision
    print("\n" + "=" * 70)
    print("PROBANDO URLS RTSP ESTÁNDAR DE HIKVISION")
    print("=" * 70)
    
    rtsp_urls = [
        "rtsp://{u}:{p}@{ip}:554/Streaming/Channels/101",  # Canal 1, mainstream
        "rtsp://{u}:{p}@{ip}:554/Streaming/Channels/102",  # Canal 1, substream
        "rtsp://{u}:{p}@{ip}:554/Streaming/Channels/201",  # Canal 2, mainstream
        "rtsp://{u}:{p}@{ip}:554/Streaming/Channels/202",  # Canal 2, substream
        "rtsp://{u}:{p}@{ip}:554/Streaming/Channels/301",  # Canal 3, mainstream
        "rtsp://{u}:{p}@{ip}:554/Streaming/Channels/302",  # Canal 3, substream
        "rtsp://{u}:{p}@{ip}:554/Streaming/Channels/1",    # Formato antiguo canal 1
        "rtsp://{u}:{p}@{ip}:554/Streaming/Channels/2",    # Formato antiguo canal 2
        "rtsp://{u}:{p}@{ip}:554/h264/ch1/main/av_stream", # Formato alternativo
        "rtsp://{u}:{p}@{ip}:554/h264/ch2/main/av_stream", # Formato alternativo
    ]
    
    print("\n📡 URLs RTSP para probar en mediamtx.yml:")
    print("-" * 70)
    
    for i, url_template in enumerate(rtsp_urls, 1):
        url = url_template.format(u=USERNAME, p=PASSWORD, ip=NVR_IP)
        # Ocultar password en la salida
        display_url = url_template.format(u=USERNAME, p="***", ip=NVR_IP)
        print(f"{i:2d}. {display_url}")
    
    print("\n" + "=" * 70)
    print("💡 RECOMENDACIONES:")
    print("=" * 70)
    print("""
1. Prueba cada URL RTSP de arriba en mediamtx.yml
2. Los canales X01 son mainstream (alta calidad)
3. Los canales X02 son substream (baja calidad, mejor para web)
4. Si ONVIF está habilitado, también verifica en la interfaz web del NVR:
   Configuration > Network > Advanced Settings > Integration Protocol
5. Asegúrate de que el usuario 'admin' tiene permisos de streaming RTSP
    """)

if __name__ == "__main__":
    try:
        discover_hikvision_channels()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrumpido por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error fatal: {e}")
        sys.exit(1)
