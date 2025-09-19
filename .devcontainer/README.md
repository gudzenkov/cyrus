# Cyrus DevContainer Environment

This DevContainer provides a complete, reproducible development environment for Cyrus - the Linear Claude Agent integration.

## Features

- **Pre-configured Development Environment**: Node.js 20, TypeScript, pnpm
- **Essential Tools**: Claude Code CLI, GitHub CLI, jq, git
- **VS Code Extensions**: Biome (linting/formatting), TypeScript support, Tailwind CSS
- **Persistent Storage**: Configuration and data persist across container rebuilds
- **Port Forwarding**: Automatic forwarding for Cyrus server and development servers

## Quick Start

1. **Open in DevContainer**
   - Open this repository in VS Code
   - When prompted, click "Reopen in Container"
   - Or use Command Palette: "Dev Containers: Reopen in Container"

2. **Initial Setup** (first time only)
   ```bash
   # Authenticate with Claude Code
   claude
   
   # Authenticate with GitHub (optional, for PR creation)
   gh auth login
   
   # Set up git user (if not already configured)
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   
   # Initialize Cyrus configuration
   cyrus
   ```

3. **Start Development**
   ```bash
   # Run all packages in development mode
   pnpm dev
   
   # Or start Cyrus agent
   cyrus
   ```

## Configuration Persistence

Your Cyrus configuration and data are automatically persisted in `/workspaces/data/`:

- `config/` - Cyrus configuration files
- `worktrees/` - Git worktrees created for Linear issues
- `logs/` - Application logs

This ensures your setup persists across container rebuilds.

## Available Commands

### Development
- `pnpm dev` - Start all packages in development mode
- `pnpm build` - Build all packages
- `pnpm test` - Run tests
- `pnpm lint` - Run linting with Biome
- `pnpm typecheck` - TypeScript type checking

### Cyrus Operations
- `cyrus` - Start Cyrus agent or configure for first time
- `claude` - Start Claude Code CLI
- `.devcontainer/scripts/init-cyrus.sh` - Initialize Cyrus setup

### Package Management
- `pnpm install` - Install dependencies
- `pnpm build` - Build all packages
- `pnpm test:packages:run` - Run package tests once

## Port Forwarding

The following ports are automatically forwarded:

- **3456** - Cyrus Server (for webhooks and OAuth)
- **5173** - Vite Development Server
- **3000** - General Application Development Server

## Environment Variables

The container sets these environment variables:

- `CYRUS_DEV_CONTAINER=true` - Indicates running in DevContainer
- `NODE_ENV=development` - Development mode

## Troubleshooting

### Container Build Issues
If the container fails to build:
```bash
# Rebuild container without cache
Command Palette > "Dev Containers: Rebuild Container"
```

### Authentication Issues
- **Claude Code**: Run `claude` and follow authentication prompts
- **GitHub**: Run `gh auth login` for GitHub integration
- **Git**: Ensure user.name and user.email are configured

### Permission Issues
```bash
# Fix file permissions if needed
sudo chown -R vscode:vscode /workspaces/cyrus
```

### Persistent Data
Configuration is stored in Docker volumes and persists across rebuilds. To reset:
```bash
# Remove persistent data volume
docker volume rm cyrus-data
```

## Advanced Configuration

### Custom Environment Variables
Create `.devcontainer/local.env` for custom environment variables:
```bash
# .devcontainer/local.env
LINEAR_API_TOKEN=your_token_here
CYRUS_BASE_URL=https://your-domain.com
```

### Additional Tools
To add more tools, modify `.devcontainer/setup.sh` or `.devcontainer/Dockerfile`.

## Security Considerations

- Secrets and tokens should be configured inside the container, not in the DevContainer files
- The container runs as the `vscode` user for security
- Persistent data is stored in Docker volumes, not bind mounts for sensitive information