FROM node:20-slim AS base
WORKDIR /app

FROM base AS server-deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS client-deps
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM base AS server-build
COPY --from=server-deps /app/node_modules /app/node_modules
COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY prisma ./prisma
COPY shared ./shared
RUN npx prisma generate
COPY src ./src
RUN npm run build:server

FROM base AS client-build
WORKDIR /app/client
ARG VITE_ENABLE_DEV_LOGIN=true
ENV VITE_ENABLE_DEV_LOGIN=$VITE_ENABLE_DEV_LOGIN
COPY --from=client-deps /app/client/node_modules ./node_modules
COPY client ./
COPY shared ../shared
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=server-build /app/dist ./dist
COPY --from=client-build /app/client/dist ./public

EXPOSE 8080
CMD ["npm", "start"]
