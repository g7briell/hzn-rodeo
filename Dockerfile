# Portal (portal.rodeoapp.pro) já compilado com Vite. A VPS só serve os arquivos estáticos.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY dist /srv
EXPOSE 3000
