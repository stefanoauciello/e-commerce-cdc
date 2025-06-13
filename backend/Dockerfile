FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json jest.config.js ./
RUN npm install --production
COPY src ./src
CMD ["node", "--loader", "ts-node/esm", "src/index.ts"]
