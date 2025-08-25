@echo off
echo Starting server...
node test-server-4200.js > server.log 2>&1
echo Server exited with code %errorlevel%
type server.log
