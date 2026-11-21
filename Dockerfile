# J Beauty — Production Containerfile (Pure Node.js 24 LTS, zero external runtime dependencies)
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
  PORT=3000 \
  OPS_PORT=3100 \
  HOST=0.0.0.0 \
  DB_PATH=/app/data/jspa.sqlite

# Set up persistent data directory and proper ownership
RUN mkdir -p /app/data && chown -R node:node /app

# Copy application source code and assets
COPY --chown=node:node package.json server.mjs seo.mjs backup.mjs index.html ./
COPY --chown=node:node public ./public
COPY --chown=node:node apps ./apps
COPY --chown=node:node packages ./packages
COPY --chown=node:node server ./server
COPY --chown=node:node api ./api
COPY --chown=node:node data ./data
COPY --chown=node:node scripts ./scripts

# Expose Customer Portal (3000) and Operations Portal (3100)
EXPOSE 3000 3100

CMD ["node", "--no-warnings", "server.mjs"]
