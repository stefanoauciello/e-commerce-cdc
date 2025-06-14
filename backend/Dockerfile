FROM node:20-alpine AS build

WORKDIR /app
COPY package.json tsconfig.json jest.config.js ./
RUN npm install
COPY src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

# Aggiungiamo NODE_OPTIONS vuoto per evitare override di loader
ENV NODE_OPTIONS=""

# Usiamo ENTRYPOINT per evitare script wrapper
ENTRYPOINT ["node"]
CMD ["dist/index.js"]
