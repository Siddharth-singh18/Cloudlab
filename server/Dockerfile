FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps for node-pty
RUN apk add --no-cache python3 make g++ linux-headers

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:20-alpine
RUN apk add --no-cache python3 make g++ linux-headers git
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

RUN mkdir -p /app/storage/projects

EXPOSE 3001
CMD ["node", "dist/index.js"]
