# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Default environment variables for upstream services to preserve local Docker Compose compatibility
ENV USER_SERVICE_HOST=user-service
ENV USER_SERVICE_PORT=3001
ENV PRODUCT_SERVICE_HOST=product-service
ENV PRODUCT_SERVICE_PORT=3002
ENV ORDER_SERVICE_HOST=order-service
ENV ORDER_SERVICE_PORT=3003

# Restrict envsubst to only substitute our specific service host/port variables
ENV NGINX_ENVSUBST_FILTER="USER_SERVICE_HOST USER_SERVICE_PORT PRODUCT_SERVICE_HOST PRODUCT_SERVICE_PORT ORDER_SERVICE_HOST ORDER_SERVICE_PORT"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
