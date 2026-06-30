#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
LOCAL_URL="http://localhost:${PORT}"
ENDPOINT_PATH="/api/willowops/scenarios/qualified-enquiry"

cat <<INFO
WillowOps tunnel helper

Local app: ${LOCAL_URL}
Make endpoint path: ${ENDPOINT_PATH}

Make.com runs in the cloud, so it usually cannot call localhost directly.
This helper starts a public tunnel if ngrok or cloudflared is already installed.

INFO

if command -v cloudflared >/dev/null 2>&1; then
  cat <<INFO
Using Cloudflare Tunnel.

After it starts, copy the https://*.trycloudflare.com URL and append:
${ENDPOINT_PATH}

Example Make URL:
https://your-tunnel.trycloudflare.com${ENDPOINT_PATH}

INFO
  exec cloudflared tunnel --url "${LOCAL_URL}"
fi

if command -v ngrok >/dev/null 2>&1; then
  cat <<INFO
Using ngrok.

After it starts, copy the Forwarding https://*.ngrok-free.app URL and append:
${ENDPOINT_PATH}

Example Make URL:
https://your-ngrok-url.ngrok-free.app${ENDPOINT_PATH}

INFO
  exec ngrok http "${PORT}"
fi

cat <<INFO
No tunnel command found.

Install one of these, then rerun:

Cloudflare Tunnel:
  brew install cloudflared
  npm run willowops:tunnel

ngrok:
  brew install ngrok/ngrok/ngrok
  ngrok config add-authtoken YOUR_NGROK_TOKEN
  npm run willowops:tunnel

Manual fallback:
  Keep using local curl/Postman tests until you are ready to wire Make.

INFO
