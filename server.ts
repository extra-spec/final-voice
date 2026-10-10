import http from "node:http";
import next from "next";
import { loadEnvConfig } from "@next/env";
import { WebSocketServer } from "ws";
import { loadCoreEnv, loadExotelEnv, type CoreEnv, type ExotelEnv } from "./src/lib/env";
import { Db } from "./src/lib/db";
import { CallsRepo } from "./src/lib/db/calls.repo";
import { ExotelSession } from "./src/telephony/exotel/session";
import { isAuthorized } from "./src/telephony/exotel/auth";
import { parseStatusBody, callIdFromCustomField } from "./src/telephony/exotel/status";

function mustLoad<T>(fn: () => T): T {
  try { return fn(); } catch (e) { console.error((e as Error).message); process.exit(1); }
}

async function main() {
  loadEnvConfig(process.cwd()); // reads .env (same loader Next uses)
  const env: CoreEnv = mustLoad(loadCoreEnv);
  const exotel: ExotelEnv | null = mustLoad(loadExotelEnv);
  console.log(exotel ? "Telephony: Exotel enabled" : "Telephony: off (demo mode only)");

  const dev = process.env.NODE_ENV !== "production";
  if (dev) console.warn("NOTE: dev mode compiles pages on first visit, which can freeze a live call. Test calls with `npm run build` then `npm start`.");

  const db = new Db(env.DB_PATH);
  const calls = new CallsRepo(db);
  const app = next({ dev });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://x");
      if (exotel && req.method === "POST" && url.pathname === "/api/exotel/status") return await onStatus(req, res, url);
      if (url.pathname === "/healthz") { res.end("ok"); return; }
      return handle(req, res);
    } catch (e) {
      console.error("request error", e);
      if (!res.headersSent) res.statusCode = 500;
      res.end("error");
    }
  });

  async function onStatus(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks).toString();
    console.log("[exotel-status] FULL BODY:", body.slice(0, 4000));
    if (!isAuthorized(req.headers.authorization, url.searchParams, exotel!.EXOTEL_WS_USER, exotel!.EXOTEL_WS_PASSWORD)) { res.statusCode = 401; res.end("unauthorized"); return; }
    const p = parseStatusBody(body, String(req.headers["content-type"] ?? ""));
    const id = callIdFromCustomField(p.customField) ?? (p.callSid ? calls.findBySid(p.callSid)?.id : undefined);
    if (id) calls.finish(id, (p.status ?? "completed").toUpperCase(), p.recordingUrl, p.duration);
    else console.warn("[exotel-status] could not match a call record", { callSid: p.callSid, customField: p.customField });
    res.end("ok");
  }

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (!exotel || url.pathname !== "/ws/exotel") {
      // Let Next's dev HMR socket through in dev; refuse everything else.
      if (dev && url.pathname.startsWith("/_next/")) return;
      socket.destroy(); return;
    }
    if (!isAuthorized(req.headers.authorization, url.searchParams, exotel!.EXOTEL_WS_USER, exotel!.EXOTEL_WS_PASSWORD)) {
      console.warn("[exotel-ws] rejected unauthorized upgrade from", req.socket.remoteAddress);
      socket.write("HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic\r\n\r\n"); socket.destroy(); return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => new ExotelSession(ws, calls, url.searchParams));
  });

  server.listen(env.PORT, () => console.log(`STRIKE.AI listening on port ${env.PORT} (${dev ? "development" : "production"})`));
}
main().catch((e) => { console.error(e); process.exit(1); });
