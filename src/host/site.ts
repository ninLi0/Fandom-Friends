/**
 * Routes a request to the API, the health check, or the pages.
 * `/api/...` goes to the application. `/health` answers the class platform's check. Everything else is a page file.
 */
export function serveSite({ api, pages }: {
  api: (request: Request) => Promise<Response>;
  /** The HTML of the single page, and the bundled browser script served at /app.js. */
  pages: () => Promise<{ page: string; script: string }>;
}) {
  const headers = { "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" };
  return async (request: Request) => {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/")) {
      const response = await api(request);
      response.headers.set("Referrer-Policy", "no-referrer");
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    if (path === "/health" && (request.method === "GET" || request.method === "HEAD")) {
      return new Response("ok", { headers });
    }
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers });
    if (path === "/app.js") {
      const { script } = await pages();
      return new Response(script, { headers: { ...headers, "Content-Type": "text/javascript; charset=utf-8" } });
    }
    // Every address the app knows shows the one page, so a public bio link such as /u/alice opens the app.
    if (path === "/" || path === "/search" || path.startsWith("/u/")) {
      const { page } = await pages();
      return new Response(page, { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
    }
    return new Response("Not found", { status: 404, headers });
  };
}
