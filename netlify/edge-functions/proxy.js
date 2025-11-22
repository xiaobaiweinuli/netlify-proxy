// 解析环境变量中的站点配置
function parseSites() {
  const sitesEnv = Deno.env.get('PROXY_SITES');
  return sitesEnv.split(',').map(site => {
    const [name, url] = site.trim().split('|');
    return { name: name.trim(), url: url.trim() };
  });
}

const SITES = parseSites();

// 统一的代理函数
function createProxy(targetUrl) {
  return async (request) => {
    const url = new URL(request.url);
    
    // 代理请求 - 直接使用原始路径
    const proxyUrl = targetUrl + url.pathname + url.search;
    
    try {
      const response = await fetch(proxyUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
      });
      
      // 复制响应头
      const headers = new Headers(response.headers);
      headers.delete('content-security-policy');
      headers.delete('x-frame-options');
      headers.set('Access-Control-Allow-Origin', '*');
      
      // 如果是HTML，重写完整URL为相对路径
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        let html = await response.text();
        
        // 将目标站点的完整URL替换为根路径
        const targetUrlPattern = targetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(targetUrlPattern, 'g'), '');
        
        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      return new Response(`代理错误: ${error.message}`, { status: 502 });
    }
  };
}

// 主处理函数
export default async (request, context) => {
  const url = new URL(request.url);
  
  // API: 获取站点列表
  if (url.pathname === '/__api__/sites') {
    return new Response(JSON.stringify(SITES), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // API: 健康检查特定站点
  if (url.pathname.startsWith('/__api__/health/')) {
    const siteIndex = parseInt(url.pathname.split('/').pop());
    const site = SITES[siteIndex];
    
    if (!site) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(site.url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      return new Response(JSON.stringify({ 
        name: site.name,
        url: site.url,
        status: response.status,
        ok: response.ok,
        latency
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        name: site.name,
        url: site.url,
        status: 500,
        ok: false,
        error: error.message,
        latency: Infinity
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  // 首页特殊处理
  if (url.pathname === '/') {
    // 检查是否刚完成测速（临时 cookie，2秒后过期）
    const cookies = request.headers.get('cookie') || '';
    const justTested = cookies.includes('just_tested=true');
    
    if (!justTested) {
      // 需要测速，显示测速页面
      return context.next();
    }
    // 刚完成测速，继续代理到实际内容
  }
  
  // 跳过静态资源和 API
  if (url.pathname === '/index.html' || url.pathname === '/favicon.ico' || 
      url.pathname.startsWith('/__')) {
    return context.next();
  }
  
  // 从 cookie 获取选择的站点
  const cookies = request.headers.get('cookie') || '';
  const siteMatch = cookies.match(/selected_site=(\d+)/);
  const selectedIndex = siteMatch ? parseInt(siteMatch[1]) : 0;
  const selectedSite = SITES[selectedIndex] || SITES[0];
  
  // 尝试代理选中的站点
  const handler = createProxy(selectedSite.url);
  const response = await handler(request);
  
  // 如果代理失败（502错误），尝试其他站点
  if (response.status === 502 && SITES.length > 1) {
    console.log(`站点 ${selectedSite.name} 不可用，尝试其他站点...`);
    
    // 尝试其他所有站点
    for (let i = 0; i < SITES.length; i++) {
      if (i === selectedIndex) continue; // 跳过已失败的站点
      
      const fallbackSite = SITES[i];
      console.log(`尝试备用站点: ${fallbackSite.name}`);
      
      const fallbackHandler = createProxy(fallbackSite.url);
      const fallbackResponse = await fallbackHandler(request);
      
      if (fallbackResponse.status !== 502) {
        // 找到可用站点，更新 cookie
        const newHeaders = new Headers(fallbackResponse.headers);
        newHeaders.append('Set-Cookie', `selected_site=${i}; path=/; SameSite=Lax`);
        
        return new Response(fallbackResponse.body, {
          status: fallbackResponse.status,
          statusText: fallbackResponse.statusText,
          headers: newHeaders
        });
      }
    }
  }
  
  return response;
};

export const config = {
  path: '/*',
  excludedPath: ['/index.html', '/favicon.ico']
};
