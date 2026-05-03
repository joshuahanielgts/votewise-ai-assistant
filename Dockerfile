# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ENV VITE_API_BASE_URL=""
RUN npm run build

# Create the Hono server file for serving the built frontend
RUN printf 'import { serve } from "@hono/node-server";\n\
import { serveStatic } from "@hono/node-server/serve-static";\n\
import { Hono } from "hono";\n\
import handler from "./dist/server/index.js";\n\
\n\
const app = new Hono();\n\
\n\
app.use("/assets/*", serveStatic({ root: "./dist/client" }));\n\
app.use("/favicon.ico", serveStatic({ path: "./dist/client/favicon.ico" }));\n\
\n\
// Proxy API calls to the Python backend\n\
app.all("/api/*", async (c) => {\n\
  const url = new URL(c.req.url);\n\
  const backendUrl = `http://127.0.0.1:8000${url.pathname}${url.search}`;\n\
  const resp = await fetch(backendUrl, {\n\
    method: c.req.method,\n\
    headers: c.req.raw.headers,\n\
    body: c.req.method !== "GET" ? await c.req.raw.text() : undefined,\n\
  });\n\
  return new Response(resp.body, {\n\
    status: resp.status,\n\
    headers: Object.fromEntries(resp.headers.entries()),\n\
  });\n\
});\n\
\n\
app.all("/health", async (c) => {\n\
  const resp = await fetch("http://127.0.0.1:8000/health");\n\
  return new Response(resp.body, { status: resp.status, headers: Object.fromEntries(resp.headers.entries()) });\n\
});\n\
\n\
app.all("*", async (c) => {\n\
  return handler.fetch(c.req.raw);\n\
});\n\
\n\
const port = parseInt(process.env.PORT || "8080");\n\
console.log(`Frontend server starting on port ${port}`);\n\
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });\n\
' > node-server.mjs

# Stage 2: Final image with both Node and Python
FROM node:22-slim

# Install Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy frontend build + node modules + server
COPY --from=frontend-builder /app/dist ./dist
COPY --from=frontend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/node-server.mjs ./node-server.mjs
COPY --from=frontend-builder /app/package.json ./package.json

# Install Python backend
COPY backend/requirements.txt /app/backend/requirements.txt
RUN python3 -m pip install --no-cache-dir --break-system-packages -r /app/backend/requirements.txt

COPY backend/ /app/backend/

# Create startup script that runs both processes
RUN printf '#!/bin/bash\n\
# Start Python backend on port 8000\n\
cd /app/backend && python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 &\n\
BACKEND_PID=$!\n\
\n\
# Wait for backend to be ready\n\
for i in $(seq 1 30); do\n\
  if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then\n\
    echo "Backend is ready"\n\
    break\n\
  fi\n\
  sleep 0.5\n\
done\n\
\n\
# Start Node frontend on PORT (default 8080)\n\
cd /app && node node-server.mjs &\n\
NODE_PID=$!\n\
\n\
# Wait for either process to exit\n\
wait -n $BACKEND_PID $NODE_PID\n\
' > /app/start.sh && chmod +x /app/start.sh

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["/app/start.sh"]
