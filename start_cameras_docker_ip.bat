@echo off
:: Test enviando DIRECTAMENTE a la IP del container Docker
:: En lugar de localhost, que podria no estar forwardeando UDP correctamente

SET USER=admin
SET PASS=j408688271A
SET NVR_IP=192.168.0.100

echo ====================================================
echo DESCUBRIENDO IP DEL CONTAINER DOCKER...
echo ====================================================

FOR /F "tokens=*" %%i IN ('docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" janus-gateway') DO SET DOCKER_IP=%%i

echo Container IP: %DOCKER_IP%
echo.

taskkill /F /IM ffmpeg.exe >nul 2>&1

echo ====================================================
echo ENVIANDO RTP DIRECTAMENTE A %DOCKER_IP%:8004
echo ====================================================

echo Iniciando Cam 1 (NVR - directo a Docker IP)...
start "Cam 1" ffmpeg -rtsp_transport tcp -i "rtsp://%USER%:%PASS%@%NVR_IP%:554/Streaming/Channels/1" -c:v copy -an -bsf:v dump_extra -f rtp -payload_type 96 "rtp://%DOCKER_IP%:8004?pkt_size=1300"

echo.
echo ====================================================
echo Revisa http://localhost:3000/conserje.html
echo Esta vez enviamos al Docker container directamente
echo ====================================================
pause
