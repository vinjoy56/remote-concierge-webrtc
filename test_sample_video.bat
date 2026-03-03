@echo off
:: Test con archivo local sample.mp4

SET JANUS_IP=127.0.0.1

echo ====================================================
echo TEST CON ARCHIVO LOCAL (sample.mp4)
echo ====================================================

taskkill /F /IM ffmpeg.exe >nul 2>&1

echo Iniciando stream de sample.mp4 a Cam 1...
start "Cam 1 - Sample" ffmpeg -re -stream_loop -1 -i "sample.mp4" -c:v copy -an -bsf:v dump_extra -f rtp -payload_type 96 "rtp://%JANUS_IP%:8004?pkt_size=1300"

echo.
echo ====================================================
echo Revisa http://localhost:3000/conserje.html
echo Si ves el video de sample.mp4, el pipeline funciona!
echo ====================================================
pause
