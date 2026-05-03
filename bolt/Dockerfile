# Kit Bolt — Railway Deployment
# Persistent Node.js process for Slack Socket Mode
# No cold starts, no timeouts, runs 24/7

FROM node:20-slim

WORKDIR /app

# Copy both bolt/ and src/lib/ (shared agent code)
COPY bolt/package.json bolt/package-lock.json* ./bolt/
COPY src/lib/ ./src/lib/

# Install bolt dependencies
WORKDIR /app/bolt
RUN npm install --production

# Copy bolt source
COPY bolt/src/ ./src/
COPY bolt/tsconfig.json ./

WORKDIR /app/bolt

# Health check — tsx runs the process, Railway monitors it
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["npx", "tsx", "src/app.ts"]
