# Markdown-Editor – minimaler statischer Webservice
# Basis: nginx auf Alpine (ca. 5 MB, gzip, Cache-Header)
FROM nginx:1.27-alpine

# Nur die notwendigen Assets kopieren (App gesamt ~64 kB)
COPY index.html /usr/share/nginx/html/
COPY css/       /usr/share/nginx/html/css/
COPY js/        /usr/share/nginx/html/js/

# Nginx-Config (gzip, Cache, SPA-Fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

# nginx laeuft mit Non-Root-Worker (standard in alpine-Image)
CMD ["nginx", "-g", "daemon off;"]
