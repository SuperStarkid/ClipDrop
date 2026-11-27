export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = "https://clipdrop-share.bakedmandrill16.chatgpt.site" + url.pathname + url.search;

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

  const reqHeaders = new Headers(context.request.headers);
  reqHeaders.set("Host", "clipdrop-share.bakedmandrill16.chatgpt.site");
  reqHeaders.set("Origin", "https://clipdrop-share.bakedmandrill16.chatgpt.site");
  reqHeaders.set("Referer", "https://clipdrop-share.bakedmandrill16.chatgpt.site/");

  const requestInit = {
    method: context.request.method,
    headers: reqHeaders,
    redirect: "follow",
  };

  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    requestInit.body = await context.request.arrayBuffer();
  }

  const response = await fetch(targetUrl, requestInit);

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
