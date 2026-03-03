FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE ${PORT:-10000}

CMD echo "ENV CHECK: DATABASE_URL=${DATABASE_URL:+SET} OPENROUTER_API_KEY=${OPENROUTER_API_KEY:+SET} PORT=${PORT}" && npm run start
