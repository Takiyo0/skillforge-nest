FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider localhost:3000/api/v1 || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "main.js"]