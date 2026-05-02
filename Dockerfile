FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# VITE_API_BASE_URL must be passed as --build-arg so Vite bakes it
# into the bundle at build time (import.meta.env.VITE_API_BASE_URL).
# It will be undefined/empty if not provided here — there is NO runtime
# substitution for Vite env vars after the build.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build && echo "=== dist contents ===" && ls dist/

# ── Nginx stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
