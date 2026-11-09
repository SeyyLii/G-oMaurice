# Image de l'application GéoMaurice Citizen.
# Construction : docker compose build   (voir README, section Docker)

ARG NODE_IMAGE=node:22-alpine
ARG PMTILES_VERSION=1.28.0
ARG TARGETARCH

# --- Outil pmtiles (sert uniquement à télécharger le fond de carte) ----------
# Une étape par architecture : Docker ne construit que celle de la machine cible
# (x86_64 pour un serveur classique, arm64 pour un Mac Apple Silicon).
FROM ${NODE_IMAGE} AS pmtiles-amd64
ARG PMTILES_VERSION
ADD https://github.com/protomaps/go-pmtiles/releases/download/v${PMTILES_VERSION}/go-pmtiles_${PMTILES_VERSION}_Linux_x86_64.tar.gz /tmp/pmtiles.tgz
RUN tar -xzf /tmp/pmtiles.tgz -C /tmp pmtiles

FROM ${NODE_IMAGE} AS pmtiles-arm64
ARG PMTILES_VERSION
ADD https://github.com/protomaps/go-pmtiles/releases/download/v${PMTILES_VERSION}/go-pmtiles_${PMTILES_VERSION}_Linux_arm64.tar.gz /tmp/pmtiles.tgz
RUN tar -xzf /tmp/pmtiles.tgz -C /tmp pmtiles

FROM pmtiles-${TARGETARCH} AS pmtiles

# --- Application -------------------------------------------------------------
FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data
WORKDIR /app

# Dépendances d'abord : cette couche reste en cache tant que package*.json ne change pas.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=pmtiles /tmp/pmtiles /usr/local/bin/pmtiles
COPY server.js ./
COPY scripts ./scripts
COPY public ./public

# Dossiers persistants (montés en volumes) appartenant à l'utilisateur non root « node ».
RUN mkdir -p /app/data /app/public/tiles && chown -R node:node /app/data /app/public/tiles
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/categories').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
