# Markdown-Editor – minimaler statischer Webservice
# Basis: nginx auf Alpine (ca. 5 MB, gzip, Cache-Header)
FROM nginx:1.27-alpine

# ===== Buildzeit-Variablen (für dynamische Metadaten) =====
ARG VERSION=0.1.12
ARG VCS_REF=dev
ARG BUILD_DATE
ARG TARGETARCH
ARG TARGETPLATFORM

# ===== OCI / CNCF Standard-Metadaten =====
LABEL org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.title="markdown-editor" \
      org.opencontainers.image.description="Tiny, fast Markdown editor with live preview. No framework, no build step." \
      org.opencontainers.image.authors="Daniel Neuhaus <kueder1@gmx.net>" \
      org.opencontainers.image.vendor="dneuhaus76" \
      org.opencontainers.image.licenses="GPL-3.0-only" \
      org.opencontainers.image.source="https://github.com/dneuhaus76/markdown-editor" \
      org.opencontainers.image.ref="${VCS_REF}" \
      org.opencontainers.image.url="https://hub.docker.com/r/dneuhaus76/markdown-editor"

# ===== Projektinterne Metadaten =====
LABEL de.dneuhaus.app.category="webapp" \
      de.dneuhaus.app.arch="${TARGETARCH}" \
      de.dneuhaus.app.version="${VERSION}"

# Nur die notwendigen Assets kopieren (App gesamt ~64 kB)
COPY index.html /usr/share/nginx/html/
COPY css/       /usr/share/nginx/html/css/
COPY js/        /usr/share/nginx/html/js/

# Nginx-Config (gzip, Cache, SPA-Fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Version aus Build-ARG in die App injizieren (SSOT: VERSION-Datei)
RUN sed -i "s|__VERSION__|${VERSION}|g" /usr/share/nginx/html/index.html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

# nginx laeuft mit Non-Root-Worker (standard in alpine-Image)
CMD ["nginx", "-g", "daemon off;"]
