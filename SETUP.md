# 快速配置指南

## 本地开发

### 1. 编辑 `.env` 文件

打开 `.env` 文件，配置你的源站点：

```env
PROXY_SITES=Netlify|https://your-site.netlify.app,Cloudflare|https://your-site.pages.dev
```

### 2. 启动开发服务器

```bash
netlify dev
```

### 3. 访问

打开浏览器访问 `http://localhost:8888/`

---

## 部署到 Netlify

### 方法一：通过 Netlify CLI

```bash
# 登录 Netlify
netlify login

# 初始化站点
netlify init

# 设置环境变量
netlify env:set PROXY_SITES "Netlify|https://your-site.netlify.app,Cloudflare|https://your-site.pages.dev"

# 部署
netlify deploy --prod
```

### 方法二：通过 Netlify 控制台

1. 访问 [Netlify Dashboard](https://app.netlify.com/)
2. 点击 **Add new site** → **Import an existing project**
3. 连接你的 Git 仓库
4. 在 **Site settings** → **Environment variables** 中添加：
   - **Key**: `PROXY_SITES`
   - **Value**: `Netlify|https://your-site.netlify.app,Cloudflare|https://your-site.pages.dev`
5. 点击 **Deploy site**

---

## 添加更多源站点

只需在环境变量中添加，用逗号分隔：

```env
PROXY_SITES=站点1|URL1,站点2|URL2,站点3|URL3
```

例如：

```env
PROXY_SITES=Netlify|https://site1.netlify.app,Cloudflare|https://site2.pages.dev,Vercel|https://site3.vercel.app,GitHub|https://site4.github.io
```

---

## 验证配置

访问你的代理站点，打开浏览器控制台（F12），你会看到：

```
检测 2 个站点...
最快站点: Cloudflare (150ms)
所有站点测速结果: Netlify: 300ms, Cloudflare: 150ms
```

---

## 常见问题

### Q: 为什么每次访问都要测速？

A: 系统使用 sessionStorage，只在当前会话中缓存选择。关闭浏览器后会重新测速，确保始终选择最快的站点。

### Q: 如果某个站点挂了怎么办？

A: 系统会自动跳过不可用的站点，选择其他可用站点。如果当前使用的站点失败，会自动切换到其他站点。

### Q: 可以添加多少个源站点？

A: 理论上无限制，但建议不超过5个，以免测速时间过长。

### Q: 本地开发时修改 `.env` 需要重启吗？

A: 是的，修改 `.env` 后需要重启 `netlify dev`。

### Q: 生产环境修改环境变量需要重新部署吗？

A: 是的，在 Netlify 控制台修改环境变量后，需要触发重新部署（可以手动触发或推送代码）。
