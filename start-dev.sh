#!/bin/bash

# Auto-restart development server script
# This script will automatically restart the dev server if it crashes

cd "$(dirname "$0")"

echo "🚀 Starting development server with auto-restart..."
echo "📍 Working directory: $(pwd)"
echo "⏰ Started at: $(date)"
echo ""
echo "Press Ctrl+C to stop"
echo "----------------------------------------"

# Function to start the dev server
start_dev_server() {
    npm run dev
}

# Keep restarting the server if it crashes
while true; do
    start_dev_server

    # If the server exits, wait 2 seconds before restarting
    exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo ""
        echo "⚠️  Dev server stopped with exit code: $exit_code"
        echo "🔄 Restarting in 2 seconds..."
        echo "----------------------------------------"
        sleep 2
    else
        echo ""
        echo "✅ Dev server stopped normally"
        break
    fi
done
