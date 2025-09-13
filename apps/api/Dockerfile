FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || npm i
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
EXPOSE 3001
CMD [ "sh", "-c", "node dist/migrate.js && node dist/main.js" ]
