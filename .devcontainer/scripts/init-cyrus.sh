#!/bin/bash
set -e

echo "🔧 Initializing Cyrus in DevContainer..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Ensure Claude Code is authenticated
echo "📋 Checking Claude Code authentication..."
if ! claude --version >/dev/null 2>&1; then
    echo "❌ Claude Code CLI not found or not authenticated"
    echo "Please run: claude"
    echo "Then follow the authentication prompts"
    exit 1
fi

# Check if Cyrus config exists
if [ ! -f ~/.cyrus/config.json ]; then
    echo "⚙️  No Cyrus config found. Creating initial setup..."
    
    # Create config directory and link to persistent storage
    mkdir -p ~/.cyrus
    mkdir -p /workspaces/data/config
    
    echo "📖 To complete Cyrus setup, run:"
    echo "  1. cyrus"
    echo "  2. Follow the OAuth setup prompts"
    echo "  3. Configure your repository settings"
    echo ""
    echo "💡 Your configuration will be persisted in /workspaces/data/config/"
    
else
    echo "✅ Cyrus config found"
fi

# Ensure git is configured
if [ -z "$(git config --global user.name)" ]; then
    echo "⚠️  Git user not configured. Please set up git:"
    echo "  git config --global user.name 'Your Name'"
    echo "  git config --global user.email 'your.email@example.com'"
fi

# Check if GitHub CLI is authenticated
if ! gh auth status >/dev/null 2>&1; then
    echo "⚠️  GitHub CLI not authenticated. Run: gh auth login"
fi

echo "🎉 Cyrus DevContainer initialization complete!"
echo ""
echo "🚀 Next steps:"
echo "  1. Ensure Claude Code is authenticated: claude"
echo "  2. Set up GitHub authentication: gh auth login"
echo "  3. Configure git user settings if needed"
echo "  4. Run Cyrus: cyrus"