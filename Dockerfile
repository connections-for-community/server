FROM node:20-bookworm

# Install Playwright browsers and dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    wget \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright (with browsers)
RUN npm install -g playwright express axios && \
    npx playwright install --with-deps chromium

# Install n8n globally
RUN npm install -g n8n

# Use node user (safer)
USER node
WORKDIR /home/node

# Default command
CMD ["n8n"]