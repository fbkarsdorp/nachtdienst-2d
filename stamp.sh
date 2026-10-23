#!/bin/sh
# Stamp a new version before publishing: every script and stylesheet in index.html is asked for by version,
# so a browser that kept the old files (GitHub Pages lets it, for ten minutes) fetches the new ones at once.
cd "$(dirname "$0")" || exit 1
v=$(date +%Y%m%d-%H%M)
sed -i '' -E "s/\?v=[0-9-]+\"/?v=$v\"/g; s/(name=\"nachtdienst-version\" content=\")[^\"]*/\1$v/" index.html
echo "version $v"
