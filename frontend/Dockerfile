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
ENV AI_SERVICE_HOST=ai-service
ENV AI_SERVICE_PORT=3004

# Restrict envsubst to only substitute our specific service host/port variables using a robust substring match
ENV NGINX_ENVSUBST_FILTER="SERVICE_"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
