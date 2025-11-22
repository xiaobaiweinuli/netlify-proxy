# 智能代理服务

这是一个智能的反向代理服务，自动检测多个源站点的响应速度，选择最快的进行代理，为用户提供最佳访问体验。

## 特性

- ✅ **自动测速** - 首次访问时自动检测所有源站点的响应速度
- ✅ **智能选择** - 自动选择最快的站点进行代理
- ✅ **透明代理** - 用户看到干净的URL（如 `hexo.netlify.app/wiki/`）
- ✅ **缓存机制** - 测速结果缓存24小时，避免重复测速
- ✅ **多站点支持** - 轻松配置多个源站点
- ✅ **自动重写** - HTML中的完整URL自动转换为相对路径

## 使用场景

假设你的博客同时部署在：
- Netlify: `https://lovely-mousse-93954f.netlify.app`
- Cloudflare Pages: `https://xiaobaiweinuli-github-io.pages.dev`

部署此代理项目到 `https://hexo.netlify.app` 后：

1. 用户访问 `https://hexo.netlify.app`
2. 系统自动测速两个源站点
3. 选择响应最快的站点（如 Cloudflare）
4. 代理该站点的内容
5. 用户看到的URL始终是 `https://hexo.netlify.app/wiki/xxx`

## 配置方法

### 1. 配置源站点

#### 本地开发

已经为你创建了 `.env` 文件，编辑它来配置你的源站点：

```env
# 格式: 名称|URL，多个站点用逗号分隔
PROXY_SITES=Netlify|https://lovely-mousse-93954f.netlify.app,Cloudflare|https://xiaobaiweinuli-github-io.pages.dev
```

你可以添加任意多个站点：

```env
PROXY_SITES=Netlify|https://site1.netlify.app,Cloudflare|https://site2.pages.dev,Vercel|https://site3.vercel.app
```

#### 生产环境（Netlify）

1. 在 Netlify 控制台打开你的站点
2. 进入 **Site settings** → **Environment variables**
3. 添加环境变量：
   - **Key**: `PROXY_SITES`
   - **Value**: `Netlify|https://lovely-mousse-93954f.netlify.app,Cloudflare|https://xiaobaiweinuli-github-io.pages.dev`
4. 保存并重新部署

### 2. 本地测试

```bash
netlify dev
```

访问 `http://localhost:8888/`，系统会自动测速并选择最快的站点。

### 3. 部署到 Netlify

1. 在 Netlify 控制台创建新站点
2. 连接你的 Git 仓库
3. 配置环境变量（见上方"生产环境"部分）
4. 部署完成

## 工作原理

```
用户访问 hexo.netlify.app
         ↓
    加载 index.html
         ↓
    调用 /__api__/sites 获取站点列表
         ↓
    并发测速所有站点 (/__api__/health/0, /__api__/health/1, ...)
         ↓
    选择最快的站点，保存到 cookie 和 localStorage
         ↓
    重定向到 /wiki/ (或其他路径)
         ↓
    Edge Function 读取 cookie，使用选定的站点进行代理
         ↓
    返回内容，URL 保持为 hexo.netlify.app/wiki/xxx
```

## API 端点

- `/__api__/sites` - 获取所有配置的源站点列表
- `/__api__/health/{index}` - 检查指定站点的健康状态和响应时间

## 文件说明

- `netlify/edge-functions/proxy.js` - 代理逻辑和API端点
- `netlify.toml` - Netlify配置
- `index.html` - 测速和选择页面
- `.env` - 环境变量配置（不提交到git）
- `.env.example` - 环境变量示例

## 缓存说明

- 测速结果缓存在 localStorage 和 cookie 中
- 缓存有效期：24小时
- 24小时后自动重新测速
- 可以清除浏览器缓存来强制重新测速

## 添加新站点

只需在 `.env` 文件中添加新站点即可：

```env
PROXY_SITES=站点1|URL1,站点2|URL2,站点3|URL3
```

无需修改任何代码！
