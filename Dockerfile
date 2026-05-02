FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

RUN npm install @hono/node-server --save

RUN printf 'import { serve } from "@hono/node-server";\nimport { serveStatic } from "@hono/node-server/serve-static";\nimport handler from "./dist/server/index.js";\nconst port = parseInt(process.env.PORT || "8080");\nserve({ fetch: handler.fetch, port, hostname: "0.0.0.0" }, () => console.log("Listening on port " + port));\n' > node-server.mjs

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "node-server.mjs"]
