#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para descubrir automáticamente las URLs de streaming del NVR usando ONVIF
Requiere: pip install onvif-zeep
"""

import sys
import os

# Fix encoding para Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from onvif import ONVIFCamera

# Configuración del NVR
NVR_IP = '192.168.0.100'
NVR_PORT = 80  # Puerto ONVIF (usualmente 80 o 8000)
USERNAME = 'admin'
PASSWORD = 'j408688271A'

# Path a WSDL files
WSDL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'wsdl')

def discover_streams():
    print("=" * 60)
    print("DESCUBRIMIENTO DE STREAMS ONVIF")
    print("=" * 60)
    print(f"\nConectando a NVR: {NVR_IP}:{NVR_PORT}")
    print(f"Usuario: {USERNAME}")
    print()
    
    try:
        # Crear cliente ONVIF
        print("Iniciando cliente ONVIF...")
        
        # Buscar directorio WSDL en el paquete onvif-zeep
        import onvif
        package_wsdl = os.path.join(os.path.dirname(onvif.__file__), 'wsdl')
        
        mycam = ONVIFCamera(NVR_IP, NVR_PORT, USERNAME, PASSWORD, wsdl_dir=package_wsdl)
        
        # Obtener servicio de medios
        print("Obteniendo servicio de medios...")
        media_service = mycam.create_media_service()
        
        # Obtener todos los perfiles de streaming
        print("Descubriendo perfiles de streaming...\n")
        profiles = media_service.GetProfiles()
        
        print(f"✅ Encontrados {len(profiles)} perfiles de streaming:\n")
        print("=" * 60)
        
        for i, profile in enumerate(profiles, 1):
            print(f"\n📹 PERFIL {i}: {profile.Name}")
            print(f"   Token: {profile.token}")
            
            # Obtener URI de streaming para este perfil
            try:
                stream_uri_req = {
                    'StreamSetup': {
                        'Stream': 'RTP-Unicast',
                        'Transport': {'Protocol': 'RTSP'}
                    },
                    'ProfileToken': profile.token
                }
                stream_uri = media_service.GetStreamUri(stream_uri_req)
                
                print(f"   📡 RTSP URL: {stream_uri.Uri}")
                print(f"   ⏱️  Timeout: {stream_uri.Timeout if hasattr(stream_uri, 'Timeout') else 'N/A'}")
                
                # Información de video si está disponible
                if profile.VideoEncoderConfiguration:
                    vid = profile.VideoEncoderConfiguration
                    print(f"   🎥 Video: {vid.Encoding} @ {vid.Resolution.Width}x{vid.Resolution.Height}")
                    print(f"   📊 Bitrate: {vid.RateControl.BitrateLimit} kbps")
                    print(f"   🎞️  FPS: {vid.RateControl.FrameRateLimit}")
                
            except Exception as e:
                print(f"   ❌ Error obteniendo URI: {e}")
        
        print("\n" + "=" * 60)
        print("\n✅ DESCUBRIMIENTO COMPLETO")
        print("\nCopia las URLs RTSP de arriba y úsalas en mediamtx.yml")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("\nPosibles causas:")
        print("  - ONVIF no está habilitado en el NVR")
        print("  - Puerto ONVIF incorrecto (prueba 8000 en lugar de 80)")
        print("  - Credenciales incorrectas")
        print("  - El usuario no tiene permisos ONVIF")
        print("\nPara instalar dependencias: pip install onvif-zeep")
        sys.exit(1)

if __name__ == "__main__":
    discover_streams()
