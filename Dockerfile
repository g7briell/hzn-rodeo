# Site rodeoapp.pro já compilado (Next.js standalone). A VPS só copia e roda, sem npm install nem build.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
