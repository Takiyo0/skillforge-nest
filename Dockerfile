FROM node:20-alpine AS nest_builder

WORKDIR /app
RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS vite_builder

ARG VITE_BASE_API=/api/v1
ARG VITE_BASE_S3

WORKDIR /app
RUN apk add --no-cache dumb-init

# i want to use git
RUN apk add --no-cache git
RUN git clone https://github.com/Takiyo0/skillforge-vite.git ./

RUN npm ci
RUN npm i -D @types/node

ENV VITE_BASE_API=${VITE_BASE_API} \
     VITE_BASE_S3=${VITE_BASE_S3}

RUN npm run build

FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=nest_builder /app/dist ./
COPY --from=vite_builder /app/dist ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider localhost:3000/api/v1 || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "main.js"]