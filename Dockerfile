FROM node:20-alpine AS base

# Install nginx and security tools
RUN apk add --no-cache nginx netcat-openbsd \
    && apk add --no-cache --upgrade busybox

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/docs/app/api-reference/cli/next#telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup -S -g 1001 nodejs \
    && adduser -S -D -h /app -s /bin/ash -G nodejs -u 1001 nextjs

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx directories and set permissions for nginx user
RUN mkdir -p /var/lib/nginx/tmp/client_body \
             /var/lib/nginx/tmp/proxy \
             /var/lib/nginx/tmp/fastcgi \
             /var/lib/nginx/tmp/uwsgi \
             /var/lib/nginx/tmp/scgi \
             /var/lib/nginx/logs \
             /var/log/nginx \
             /run/nginx

# nginx user should own nginx directories, nextjs user owns app directories
RUN chown -R nginx:nginx /var/lib/nginx /var/log/nginx /run/nginx

# Copy public assets
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create startup script
COPY <<EOF /start.sh
#!/bin/sh
set -e

# Function to check if Next.js is ready
wait_for_nextjs() {
    echo "Waiting for Next.js to start on port 3000..."
    for i in \$(seq 1 30); do
        # Use nc (netcat) instead of wget for security - only checks port availability
        if nc -z localhost 3000 2>/dev/null; then
            echo "Next.js is ready!"
            return 0
        fi
        echo "Waiting... (\$i/30)"
        sleep 2
    done
    echo "Timeout waiting for Next.js to start"
    exit 1
}

# Create PID directory for nginx
mkdir -p /run/nginx

# Start Next.js in background first
echo "Starting Next.js..."
su -s /bin/ash nextjs -c 'cd /app && export PATH="/usr/local/bin:$PATH" && node server.js' &
NEXTJS_PID=\$!

# Wait for Next.js to be ready
wait_for_nextjs

# Start nginx as root (for port 80 binding) in background
echo "Starting nginx..."
nginx -g 'daemon off;' &
NGINX_PID=\$!

# Wait for any process to exit
wait
EOF

RUN chmod +x /start.sh

# Don't switch to nextjs user here - we need root to bind port 80
# The startup script handles user switching for Next.js

EXPOSE 80

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["/start.sh"]
