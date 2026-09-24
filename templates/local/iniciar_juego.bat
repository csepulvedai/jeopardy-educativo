@echo off
title JEOPARDY EDUCATIVO - SERVIDOR
echo ====================================================
echo   INICIANDO JEOPARDY: IA EN PROCESOS EVALUATIVOS
echo ====================================================
echo.
echo Iniciando servidor y generando enlace de Zoom...
echo Por favor espera unos segundos...
echo.

start "" "http://localhost:3000"
node server.js
pause
