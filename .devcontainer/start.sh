#!/bin/bash
# Starts both servers in the background on every Codespace resume.
# Logs go to /tmp/backend.log and /tmp/frontend.log

ROOT=/workspaces/upgraded-happiness

echo "🚀 Starting FastAPI backend on port 8000..."
cd "$ROOT/la-liga-manager/backend"
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  > /tmp/backend.log 2>&1 &

echo "🚀 Starting React frontend on port 5173..."
cd "$ROOT/la-liga-manager/frontend"
nohup npm run dev -- --host --port 5173 \
  > /tmp/frontend.log 2>&1 &

echo ""
echo "✅ Both servers started."
echo "   Backend logs : tail -f /tmp/backend.log"
echo "   Frontend logs: tail -f /tmp/frontend.log"
echo ""
echo "   The React app will open automatically in your browser."
