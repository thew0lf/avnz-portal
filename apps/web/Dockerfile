FROM node:18-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || npm i
COPY . .
RUN npm run build || echo "Skipping build (dev mode)"
EXPOSE 3000
CMD ["npm","run","dev"]
