@echo off
:: Script FINAL OPTIMIZADO (Windows)
:: Ruta: /Streaming/Channels/<ID>
:: Mejoras: Limite de Bitrate y Resolucion para no saturar VPN

SET NVR_IP=192.168.0.100
SET USER=admin
SET PASS=j408688271A
SET JANUS_IP=127.0.0.1

:: PARAMS OPTIMIZADOS:
:: -b:v 600k  -> Limita ancho de banda (vital para VPN)
:: -s 640x360 -> Baja resolucion (ahorra CPU y RED)
SET PARAMS=-c:v libx264 -profile:v baseline -tune zerolatency -preset ultrafast -b:v 600k -s 640x360 -g 30 -an -bsf:v dump_extra -f rtp -payload_type 96 -pix_fmt yuv420p

echo ====================================================
echo INICIANDO STREAMING OPTIMIZADO (VPN FRIENDLY)
echo ====================================================

taskkill /F /IM ffmpeg.exe >nul 2>&1

echo Iniciando Camara 1 (640x360 @ 600k)...
start "Cam 1" ffmpeg -re -rtsp_transport tcp -i "rtsp://%USER%:%PASS%@%NVR_IP%:554/Streaming/Channels/1" %PARAMS% rtp://%JANUS_IP%:8004?pkt_size=1300

echo Iniciando Camara 2 (640x360 @ 600k)...
start "Cam 2" ffmpeg -re -rtsp_transport tcp -i "rtsp://%USER%:%PASS%@%NVR_IP%:554/Streaming/Channels/2" %PARAMS% rtp://%JANUS_IP%:8006?pkt_size=1300

echo Iniciando Camara 3 (640x360 @ 600k)...
start "Cam 3" ffmpeg -re -rtsp_transport tcp -i "rtsp://%USER%:%PASS%@%NVR_IP%:554/Streaming/Channels/3" %PARAMS% rtp://%JANUS_IP%:8008?pkt_size=1300

echo.
echo ====================================================
echo Abre http://localhost:3000/conserje.html
echo ====================================================
pause
