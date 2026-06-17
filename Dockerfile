# 统一用户管理系统 Dockerfile
# 阶段1：构建前端
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install --registry=https://registry.npmmirror.com
COPY . .
RUN npm run build

# 阶段2：运行后端
FROM node:20-alpine
WORKDIR /app

# 复制后端代码
COPY server/package*.json ./server/
RUN cd server && npm install --registry=https://registry.npmmirror.com

COPY server/ ./server/

# 复制前端构建产物
COPY --from=frontend-build /app/dist ./server/dist

WORKDIR /app/server

EXPOSE 3890
CMD ["node", "src/app.js"]
