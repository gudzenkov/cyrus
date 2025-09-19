#!/bin/bash
set -e

echo "🚀 Setting up Cyrus DevContainer environment..."

# Install pnpm globally
npm install -g pnpm@10.13.1

# Install jq (required by claude-parser package)
apt-get update && apt-get install -y jq

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build all packages
echo "🔨 Building packages..."
pnpm build

# Set up git config for container
git config --global --add safe.directory /workspaces/cyrus
git config --global init.defaultBranch main

# Create data directories for persistent storage
mkdir -p /workspaces/data/{config,worktrees,logs}

# Set up symbolic links for Cyrus config if it doesn't exist
if [ ! -f ~/.cyrus/config.json ]; then
    mkdir -p ~/.cyrus
    if [ -f /workspaces/data/config/config.json ]; then
        ln -sf /workspaces/data/config/config.json ~/.cyrus/config.json
        echo "📎 Linked existing Cyrus config"
    else
        echo "ℹ️  No existing Cyrus config found. Run 'cyrus' to set up initial configuration."
    fi
fi

echo "✅ DevContainer setup complete!"
echo ""
echo "🔧 Available commands:"
echo "  - pnpm dev           # Start development mode"
echo "  - pnpm build         # Build all packages"
echo "  - pnpm test          # Run tests"
echo "  - pnpm lint          # Run linting"
echo "  - cyrus              # Start Cyrus agent"
echo "  - claude             # Start Claude Code CLI"
echo ""
echo "📂 Persistent data is stored in /workspaces/data/"
echo "   - config/          # Cyrus configuration"
echo "   - worktrees/       # Git worktrees for issues"
echo "   - logs/            # Application logs"