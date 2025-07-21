#!/bin/bash

# Echo Chat Development Startup Script
echo "🚀 Starting Echo Chat Development Environment..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Check if dependencies are installed
if [ ! -d "CLIENT/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd CLIENT && npm install && cd ..
fi

if [ ! -d "SERVER/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd SERVER && npm install && cd ..
fi

# Check environment files
if [ ! -f "SERVER/.env" ]; then
    echo "⚠️  SERVER/.env not found. Creating from example..."
    cp SERVER/.env.example SERVER/.env
    echo "📝 Please edit SERVER/.env with your MongoDB connection string"
fi

if [ ! -f "CLIENT/.env" ]; then
    echo "⚠️  CLIENT/.env not found. Creating from example..."
    cp CLIENT/.env.example CLIENT/.env
fi

echo ""
echo "🎯 Starting development servers..."
echo "📍 Frontend will be available at: http://localhost:5173"
echo "📍 Backend API will be available at: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers in parallel
trap 'kill $(jobs -p)' EXIT

# Start server in background
echo "🔧 Starting backend server..."
cd SERVER && npm run dev &

# Wait a moment for server to start
sleep 3

# Start client
echo "🎨 Starting frontend client..."
cd CLIENT && npm run dev

# Keep script running
wait