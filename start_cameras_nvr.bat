@echo off
:: Test de NVR directo sin encoding

SET USER=admin
SET PASS=j408688271A
SET NVR_IP=192.168.0.100
SET JANUS_IP=127.0.0.1

echo ====================================================
echo MODO NVR DIRECTO (Sin re-encoding, -c:v copy)
echo ====================================================

taskkill /F /IM ffmpeg.exe >nul 2>&1

echo Iniciando Cam 1 (NVR - COPY sin encoding)...
start "Cam 1" ffmpeg -rtsp_transport tcp -i "rtsp://%USER%:%PASS%@%NVR_IP%:554/Streaming/Channels/1" -c:v copy -an -bsf:v dump_extra -f rtp -payload_type 96 "rtp://%JANUS_IP%:8004?pkt_size=1300"

echo.
echo ====================================================
echo Revisa http://localhost:3000/conserje.html
echo Si ves VIDEO REAL en Cam 1, la ruta WebRTC funciona.
echo Si sigue NEGRO, el problema es red/puertos.
echo ====================================================
pause
