#!/bin/bash

echo "-------------------------------------------------------"
echo "  LabData Manager - Start Script"
echo "-------------------------------------------------------"
echo ""

# Funktion zum Öffnen des Browsers (OS-unabhängig)
open_url() {
    local url=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$url"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "$url"
    fi
}

# 1. Versuch: Node.js
if command -v npx &> /dev/null; then
    echo "[INFO] Node.js gefunden. Starte Webserver auf Port 3000..."
    
    # Browser im Hintergrund verzögert öffnen
    (sleep 1 && open_url "http://localhost:3000/LaborTool.html") &
    
    # Server starten
    npx serve . -p 3000

# 2. Versuch: Python 3
elif command -v python3 &> /dev/null; then
    echo "[INFO] Python 3 gefunden. Starte http.server auf Port 8000..."
    
    (sleep 1 && open_url "http://localhost:8000/LaborTool.html") &
    python3 -m http.server 8000

# 3. Fallback
else
    echo "[WARN] Weder Node.js noch Python gefunden."
    echo "[INFO] Öffne Datei direkt..."
    open_url "LaborTool.html"
fi