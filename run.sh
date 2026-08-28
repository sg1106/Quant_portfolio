#!/bin/bash

# Setup and run script for Swastik's Portfolio + ResumeLLM RAG backend

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Portfolio & ResumeLLM RAG Server Setup ==="

# 1. Navigate to the project root (where this script is located)
cd "$(dirname "$0")"

# 2. Check for python3
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed on your system."
    echo "Please install Python 3.8+ and try again."
    exit 1
fi

# 3. Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment (.venv)..."
    python3 -m venv .venv
fi

# 4. Activate virtual environment
echo "🔌 Activating virtual environment..."
source .venv/bin/activate

# 5. Upgrade pip and install requirements
echo "📥 Installing python dependencies (this may take a minute)..."
pip install --upgrade pip
pip install -r requirements.txt

# 6. Check for .env file
if [ ! -f ".env" ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Created .env file! Please edit .env and add your GEMINI_API_KEY."
fi

# 7. Check for PDF Resume
if [ ! -f "swastik_resume.pdf" ]; then
    echo ""
    echo "========================================================================="
    echo "⚠️  WARNING: 'swastik_resume.pdf' was not found in $(pwd)"
    echo "   The Flask server will start, but RAG operations will return errors"
    echo "   until you place your PDF resume file in this folder."
    echo "========================================================================="
    echo ""
fi

# 8. Start Flask app
echo "🚀 Launching ResumeLLM RAG Server..."
python3 app.py
