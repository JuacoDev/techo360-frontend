# Etapa 1: construir la app
FROM node:20-alpine AS build
WORKDIR /app

# VITE_API_URL se hornea en el bundle en tiempo de build (Vite no lee
# variables de entorno en tiempo de ejecucion) -- default "" A PROPOSITO
# (ruta relativa, NO un valor faltante -- no completar con una URL) para
# que las peticiones del frontend pasen por el proxy de nginx del propio
# contenedor (location /api/ y /auth/, ver nginx.conf), en vez de apuntar
# a localhost o quedar "undefined" (causa confirmada de
# /undefined/auth/login en produccion, arreglado y verificado en vivo el
# 01-sep-2026).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY package.json .
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: servir con nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
