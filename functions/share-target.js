export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetHost = "clipdrop-share.bakedmandrill16.chatgpt.site";
  const targetBase = "https://" + targetHost;
  const pathname = url.pathname;

  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      }
    });
  }

  // 1. Intercept DELETE on posts: /api/rooms/:code/posts/:kind/:id
  const deleteMatch = pathname.match(/^\/api\/rooms\/([^/]+)\/posts\/(text|links|images|files)\/([^/]+)$/);
  if (context.request.method === "DELETE" && deleteMatch) {
    const [, roomCode, , postId] = deleteMatch;
    
    const targetPostUrl = `${targetBase}/api/rooms/${roomCode}/posts`;
    const boundary = "----ClipdropDelete" + Math.random().toString(36).slice(2);
    const bodyStr = `--${boundary}\r\nContent-Disposition: form-data; name="kind"\r\n\r\ntext\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="sensitive"\r\n\r\nfalse\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="value"\r\n\r\n__CLIPDROP_DELETE__:${postId}\r\n` +
      `--${boundary}--\r\n`;

    const deleteHeaders = new Headers();
    deleteHeaders.set("Host", targetHost);
    deleteHeaders.set("Origin", targetBase);
    deleteHeaders.set("Referer", targetBase + "/");
    deleteHeaders.set("Content-Type", `multipart/form-data; boundary=${boundary}`);
    if (context.request.headers.has("X-Room-Generation")) {
      deleteHeaders.set("X-Room-Generation", context.request.headers.get("X-Room-Generation"));
    }
    if (context.request.headers.has("X-Clipdrop-Client")) {
      deleteHeaders.set("X-Clipdrop-Client", context.request.headers.get("X-Clipdrop-Client"));
    }

    try {
      await fetch(targetPostUrl, {
        method: "POST",
        headers: deleteHeaders,
        body: bodyStr
      });
    } catch (e) {
      // ignore
    }

    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "*",
      }
    });
  }

  // 2. Intercept GET on posts list: /api/rooms/:code/posts
  const listMatch = pathname.match(/^\/api\/rooms\/([^/]+)\/posts$/);
  if (context.request.method === "GET" && listMatch) {
    const reqHeaders = new Headers(context.request.headers);
    reqHeaders.set("Host", targetHost);
    reqHeaders.set("Origin", targetBase);
    reqHeaders.set("Referer", targetBase + "/");

    const response = await fetch(targetBase + pathname + url.search, {
      method: "GET",
      headers: reqHeaders,
    });

    if (response.ok && response.headers.get("Content-Type")?.includes("application/json")) {
      try {
        const data = await response.json();
        if (Array.isArray(data.posts)) {
          const deletedIds = new Set();
          for (const p of data.posts) {
            if (p.summary && p.summary.startsWith("__CLIPDROP_DELETE__:")) {
              deletedIds.add(p.summary.slice("__CLIPDROP_DELETE__:".length).trim());
            }
          }
          data.posts = data.posts.filter(p => {
            if (p.summary && p.summary.startsWith("__CLIPDROP_DELETE__:")) return false;
            if (deletedIds.has(p.id)) return false;
            return true;
          });
        }
        const resHeaders = new Headers(response.headers);
        resHeaders.set("Access-Control-Allow-Origin", "*");
        resHeaders.delete("content-security-policy");
        resHeaders.delete("x-frame-options");
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: resHeaders
        });
      } catch (err) {
        // fallback
      }
    }
  }

  // 3. Transparent proxy
  const reqHeaders = new Headers(context.request.headers);
  reqHeaders.set("Host", targetHost);
  reqHeaders.set("Origin", targetBase);
  reqHeaders.set("Referer", targetBase + "/");

  const requestInit = {
    method: context.request.method,
    headers: reqHeaders,
    redirect: "follow",
  };

  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    requestInit.body = await context.request.arrayBuffer();
  }

  const response = await fetch(targetBase + pathname + url.search, requestInit);

  const resHeaders = new Headers(response.headers);
  resHeaders.set("Access-Control-Allow-Origin", "*");
  resHeaders.delete("content-security-policy");
  resHeaders.delete("x-frame-options");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: resHeaders
  });
}
