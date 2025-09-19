# Use official Node.js image with TypeScript support
FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Install additional system dependencies
RUN apt-get update && apt-get install -y \
    jq \
    curl \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@10.13.1

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt update \
    && apt install gh -y

# Set up workspace
WORKDIR /workspaces/cyrus

# Create persistent data directories
RUN mkdir -p /workspaces/data/{config,worktrees,logs}

# Copy package files first for better caching
COPY package*.json pnpm-*.yaml ./
COPY apps/*/package.json ./apps/*/
COPY packages/*/package.json ./packages/*/

# Set default user
USER vscode

# Set git safe directory
RUN git config --global --add safe.directory /workspaces/cyrus