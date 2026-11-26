#!/bin/sh
# Stamp a new version so browsers load fresh files after a deploy (GitHub Pages caches files for 10 minutes).
# Run before committing a change: ./bump-version.sh
set -e
cd "$(dirname "$0")"
v=$(date +%Y%m%d%H%M%S)
printf '%s\n' "$v" > version.txt
sed -i -E "s/\?v=[0-9a-z]+/?v=$v/g; s/(name=\"app-version\" content=\")[^\"]*/\1$v/" index.html
echo "version $v"
