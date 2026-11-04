# Build the production bundle, then serve it with nginx (which also proxies /api to the gateway).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# The nginx image runs envsubst over /etc/nginx/templates/*.template at start-up.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV API_UPSTREAM=http://gateway:8080
EXPOSE 80
