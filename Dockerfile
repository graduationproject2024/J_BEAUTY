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

# Copy application source code and static assets
COPY --chown=node:node package.json server.mjs seo.mjs backup.mjs index.html ./
COPY --chown=node:node public ./public
COPY --chown=node:node apps ./apps
COPY --chown=node:node packages ./packages
COPY --chown=node:node server ./server
COPY --chown=node:node api ./api
COPY --chown=node:node data ./data
COPY --chown=node:node scripts ./scripts

USER node

# Healthcheck testing the Customer Portal API catalog response
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/catalog').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Expose Customer Portal (3000) and Operations Portal (3100)
EXPOSE 3000 3100

VOLUME ["/app/data"]

CMD ["node", "server.mjs"]
