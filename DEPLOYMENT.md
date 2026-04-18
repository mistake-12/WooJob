# 部署指南 (Deployment Guide)

## 环境准备

```bash
# 安装依赖
npm install

# 开发环境
npm run dev

# 构建生产版本
npm run build

# 本地预览生产版本
npm run start
```

---

## 部署方案

### 方案 A：Vercel（推荐）

Vercel 是 Next.js 官方推荐的部署平台，无需额外配置。

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署（交互式）
vercel

# 或者一键部署到生产环境
vercel --prod
```

**通过 GitHub 集成（非 CLI 方式）：**
1. 将项目推送到 GitHub 仓库
2. 访问 [vercel.com](https://vercel.com) → "Add New Project"
3. 导入你的 GitHub 仓库
4. Vercel 自动检测 Next.js，点击 "Deploy"

---

### 方案 B：静态导出部署

适用于 GitHub Pages、Netlify、Cloudflare Pages 等静态托管。

```bash
# 已启用静态导出，执行构建
npm run build

# 输出目录: out/
# 部署 out/ 目录到任意静态托管服务
```

**GitHub Pages 部署：**
1. 修改 `next.config.js` 中的 `basePath` 为你的仓库名
2. GitHub Actions workflow 参考：

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
          branch: gh-pages
```

---

### 方案 C：Docker 容器化部署

适用于自有服务器或 Kubernetes 环境。

#### Dockerfile（多阶段构建）

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/out ./out
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npx", "serve", "-s", "out", "-l", "3000"]
```

#### docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    restart: unless-stopped
```

```bash
# 构建并运行
docker-compose up -d

# 访问 http://localhost:3000
```

---

### 方案 D：传统 VPS / 服务器（Node.js 服务）

如果你的后端未来需要持久化数据，可以改为生产模式部署：

```bash
# 构建
npm run build

# 使用 PM2 启动
npm install -g pm2
pm2 start npm --name "job-search" -- start

# 或者使用 systemd 服务
```

---

## 环境变量

如果未来需要添加 API 或数据库支持，在项目根目录创建 `.env.local`：

```env
# .env.local (本地开发)
NEXT_PUBLIC_API_URL=http://localhost:3001

# .env.production (生产环境)
NEXT_PUBLIC_API_URL=https://your-api.com
```

---

## 性能优化建议

1. **图片优化**：如果添加图片，使用 `next/image` 组件
2. **字体优化**：当前使用 Google Fonts CDN，可考虑自托管字体
3. **代码分割**：Next.js 默认自动分割，无需额外配置
4. **缓存策略**：Vercel/Netlify 自动配置最优缓存策略

---

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 部署后样式丢失 | 检查 `basePath` 配置是否正确 |
| 404 页面问题 | 静态导出不支持动态路由，SSR 需要 Vercel/Node.js 部署 |
| 图片加载失败 | 检查 `next.config.js` 中 `images` 配置 |
| 构建失败 | 运行 `npm run build` 本地复现，检查错误信息 |
