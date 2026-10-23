#!/bin/sh
# Serve the game on http://localhost:8137/ (it also runs straight from index.html).
cd "$(dirname "$0")" && exec python3 -m http.server 8137
