#!/bin/zsh
exec python3 "$(dirname "$0")/compress-scene-images.py" "$@"
