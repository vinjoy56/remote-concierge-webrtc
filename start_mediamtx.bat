@echo off
echo ====================================================
echo Starting MediaMTX Server
echo ====================================================
echo.
echo MediaMTX will serve video streams via WebRTC
echo Configuration: mediamtx\mediamtx.yml
echo WebRTC Port: 8889
echo RTSP Port: 8554
echo.
echo Press Ctrl+C to stop
echo ====================================================
echo.

cd mediamtx
mediamtx.exe mediamtx.yml
