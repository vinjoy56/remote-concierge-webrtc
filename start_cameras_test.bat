@echo off
:: Script DE PRUEBA SINTETICA (Windows)
:: Camara 1 = Patron de Colores (Generado por CPU)
:: Camara 2 = NVR (Para comparar)

SET NVR_IP=192.168.0.100
SET USER=admin
SET PASS=j408688271A
SET JANUS_IP=127.0.0.1
SET PARAMS=-c:v h264_qsv -preset fast -b:v 400k -s 320x180 -r 15 -g 30 -an -bsf:v dump_extra -f rtp -payload_type 96

echo ====================================================
echo MODO PRUEBA DE VIDEO
echo Cam 1: Debe verse un PATRON DE COLORES
echo Cam 2: Intenta ver el NVR
echo ====================================================

taskkill /F /IM ffmpeg.exe >nul 2>&1

:: [CAM 1] PATRON DE PRUEBA (Ignora el NVR)
echo Iniciando Cam 1 (Test Pattern)...
start "Cam 1 - TEST" ffmpeg -re -f lavfi -i testsrc=size=640x360:rate=25 %PARAMS% rtp://%JANUS_IP%:8004?pkt_size=1300

:: [CAM 2] REAL (NVR)
echo Iniciando Cam 2 (Real)...
start "Cam 2 - REAL" ffmpeg -re -rtsp_transport tcp -i "rtsp://%USER%:%PASS%@%NVR_IP%:554/Streaming/Channels/2" %PARAMS% rtp://%JANUS_IP%:8006?pkt_size=1300

echo.
echo ====================================================
echo Revisa http://localhost:3000/conserje.html
echo Si ves COLORES en la Cam 1, el problema es el NVR.
echo Si ves NEGRO en la Cam 1, el problema es Janus/Docker.
echo ====================================================
pause
