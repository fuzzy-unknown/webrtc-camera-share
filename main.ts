const server = Bun.serve<{ role: string }>({
  port: 5011,
  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const role = url.searchParams.get("role");
      if (role === "send" || role === "recv") {
        if (server.upgrade(req, { data: { role } })) return;
      }
      return new Response("Bad Request", { status: 400 });
    }

    let pathname = url.pathname;
    if (pathname === "/") pathname = "/send.html";

    const file = Bun.file(import.meta.dir + "/public" + pathname);
    if (!(await file.exists())) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response(file);
  },
  websocket: {
    message(ws, message) {
      const target = ws.data.role === "send" ? "recv" : "send";
      server.publish(target, message);
    },
    open(ws) {
      ws.subscribe(ws.data.role);
      console.log(`[${new Date().toISOString()}] ${ws.data.role} connected`);
    },
    close(ws) {
      console.log(`[${new Date().toISOString()}] ${ws.data.role} disconnected`);
    },
  },
});

console.log("Running on http://127.0.0.1:5011");
console.log("  发送端: http://127.0.0.1:5011/send.html");
console.log("  接收端: http://127.0.0.1:5011/recv.html");
