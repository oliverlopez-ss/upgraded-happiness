#!/bin/bash
set -e

echo "========================================"
echo "  La Liga Manager — Codespace Setup"
echo "========================================"

# ---------- Python backend ----------
echo ""
echo "📦 Installing Python dependencies..."
cd /workspaces/upgraded-happiness/la-liga-manager/backend
pip install -r requirements.txt --quiet

echo ""
echo "🌱 Seeding the database (20 clubs, 460 players, 380 fixtures)..."
python seed.py

# ---------- Node frontend ----------
echo ""
echo "📦 Installing Node dependencies..."
cd /workspaces/upgraded-happiness/la-liga-manager/frontend
npm install --silent

echo ""
echo "========================================"
echo "  ✅ Setup complete!"
echo ""
echo "  Servers will start automatically."
echo "  Or run manually:"
echo ""
echo "  Backend : cd la-liga-manager/backend"
echo "            uvicorn app.main:app --reload"
echo ""
echo "  Frontend: cd la-liga-manager/frontend"
echo "            npm run dev -- --host"
echo "========================================"
