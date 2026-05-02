FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Install express just for serving static files
RUN npm install express --save

# Write a simple static file server
RUN echo 'const express=require("express");const path=require("path");const app=express();const PORT=process.env.PORT||8080;app.use(express.static(path.join(__dirname,"dist/client")));app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"dist/client/index.html")));app.listen(PORT,()=>console.log("Server running on port "+PORT));' > server.js

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server.js"]
