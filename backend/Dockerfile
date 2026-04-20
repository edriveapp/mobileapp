# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Create uploads directory so ServeStaticModule and media uploads don't crash on startup
RUN mkdir -p /app/public/uploads
EXPOSE 3000
CMD ["node", "dist/main.js"]
