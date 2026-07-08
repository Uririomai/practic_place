// MSW initialization for Next.js
export async function initMocks() {
  if (typeof window === "undefined") {
    // Server-side: used in Node.js (tests, SSR)
    const { server } = await import("./server");
    server.listen();
    return server;
  } else {
    // Client-side: used in browser
    const { worker } = await import("./browser");
    worker.start({
      onUnhandledRequest: "bypass",
    });
    return worker;
  }
}