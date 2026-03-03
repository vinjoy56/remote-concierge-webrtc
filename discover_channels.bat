@echo off
echo Querying NVR Channels via ISAPI...
curl -v --digest -u admin:j408688271A http://192.168.0.100/ISAPI/Streaming/channels
pause
