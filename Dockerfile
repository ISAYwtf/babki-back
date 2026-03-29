# syntax=docker/dockerfile:1.7

# Install all deps once for the build stage.
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Install production-only deps separately to keep runtime smaller.
FROM node:22-alpine AS prod-deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Final runtime image with non-root execution.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

RUN mkdir -p /app/config/secrets && chown -R node:node /app
USER node

EXPOSE 5001

# Start the compiled NestJS app.
CMD ["node", "dist/main"]

