// server.js - NetProj backend
// ----------------------------------------------------------
import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Basic setup
const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: "*", // allow all (safe for demo/project)
    methods: ["GET", "POST"],
  },
});

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// Health route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});

// Helper to sanitize targets
function sanitizeTarget(target) {
  if (!target || typeof target !== "string") return null;
  target = target.trim();
  if (!/^[A-Za-z0-9_.:-]{1,255}$/.test(target)) return null;
  return target;
}

// --- SOCKET HANDLERS --- //
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("start", (msg) => {
    const { opId, command, payload } = msg;
    if (!opId || !command || !payload?.target) return;

    const target = sanitizeTarget(payload.target);
    if (!target) {
      socket.emit("done", { opId, error: "Invalid target" });
      return;
    }

    if (command === "ping") {
      runPing(socket, opId, target, payload.count || 4);
    } else if (command === "traceroute") {
      runTraceroute(socket, opId, target);
    } else {
      socket.emit("done", { opId, error: "Unknown command" });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// --- EXECUTION HELPERS --- //
function runPing(socket, opId, target, count) {
  const cmd = process.platform === "win32" ? "ping" : "ping";
  const args = process.platform === "win32" ? ["-n", count, target] : ["-c", count, target];

  try {
    const proc = spawn(cmd, args);
    proc.stdout.on("data", (data) => {
      const line = data.toString();
      socket.emit("stream", { opId, line });
      const match = line.match(/time[=<]([\d.]+)/);
      if (match) socket.emit("stream", { opId, rtt: parseFloat(match[1]) });
    });
    proc.stderr.on("data", (data) => {
      socket.emit("stream", { opId, line: data.toString() });
    });
    proc.on("close", (code) => {
      socket.emit("done", { opId, code });
    });
  } catch (err) {
    socket.emit("done", { opId, error: err.message });
  }
}

function runTraceroute(socket, opId, target) {
  const cmd = process.platform === "win32" ? "tracert" : "traceroute";
  const args = [target];

  try {
    const proc = spawn(cmd, args);
    proc.stdout.on("data", (data) => {
      const line = data.toString();
      socket.emit("stream", { opId, line });
    });
    proc.stderr.on("data", (data) => {
      socket.emit("stream", { opId, line: data.toString() });
    });
    proc.on("close", (code) => {
      socket.emit("done", { opId, code });
    });
  } catch (err) {
    socket.emit("done", { opId, error: err.message });
  }
}

// --- START SERVER --- //
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(` NetProj backend running on port ${PORT}`);
});
