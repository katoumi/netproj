// dashboard app.js - NetProj
// ----------------------------------------------------
const BACKEND_URL =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://netproj.onrender.com"; // <--- CHANGE THIS TO YOUR RENDER URL

const socket = io(BACKEND_URL, { transports: ["websocket"] });

// DOM elements
const targetInput = document.getElementById("targetInput");
const modeSelect = document.getElementById("modeSelect");
const pingBtn = document.getElementById("pingBtn");
const traceBtn = document.getElementById("traceBtn");
const outputEl = document.getElementById("output");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const exportBtn = document.getElementById("exportBtn");
const autoAddHistory = document.getElementById("autoAddHistory");
const loader = document.getElementById("loader");
const themeBtn = document.getElementById("themeBtn");
const networkInfo = document.getElementById("networkInfo");
const countInput = document.getElementById("countInput");

let history = JSON.parse(localStorage.getItem("netproj-history") || "[]");
let chart;
let chartData = {
  labels: [],
  datasets: [
    {
      label: "RTT (ms)",
      data: [],
      tension: 0.3,
      borderWidth: 2,
      borderColor:
        getComputedStyle(document.documentElement).getPropertyValue("--accent") ||
        "#7c5cff",
    },
  ],
};

// Initialize chart
function initChart() {
  const ctx = document.getElementById("latencyChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: chartData,
    options: {
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { beginAtZero: true } },
    },
  });
}
initChart();

// Utility functions
function appendLine(t) {
  outputEl.textContent += t + "\n";
  outputEl.scrollTop = outputEl.scrollHeight;
}
function clearOutput() {
  outputEl.textContent = "";
  chartData.labels = [];
  chartData.datasets[0].data = [];
  chart.update();
  updateStats();
}
function showLoader() {
  loader.classList.remove("hidden");
}
function hideLoader() {
  loader.classList.add("hidden");
}
function sanitizeTarget(v) {
  if (!v) return "";
  const t = v.trim();
  if (!/^[A-Za-z0-9_.:-]{1,255}$/.test(t)) return "";
  return t;
}

// Simulation mode
function simulatePing(target, count = 4) {
  clearOutput();
  showLoader();
  appendLine(`PING ${target} (simulated): 56 data bytes`);
  setTimeout(() => {
    for (let i = 1; i <= count; i++) {
      const rtt = parseFloat((Math.random() * 80 + 6).toFixed(2));
      appendLine(
        `64 bytes from ${target}: icmp_seq=${i} ttl=${
          Math.floor(Math.random() * 30) + 50
        } time=${rtt} ms`
      );
      chartData.labels.push(String(i));
      chartData.datasets[0].data.push(rtt);
      chart.update();
    }
    appendLine("");
    appendLine(`--- ${target} ping statistics ---`);
    appendLine(`${count} packets transmitted, ${count} received, 0% packet loss`);
    appendLine(
      `rtt min/avg/max = ${Math.min(...chartData.datasets[0].data).toFixed(
        2
      )}/${(
        chartData.datasets[0].data.reduce((a, b) => a + b, 0) /
        chartData.datasets[0].data.length
      ).toFixed(2)}/${Math.max(...chartData.datasets[0].data).toFixed(2)} ms`
    );
    hideLoader();
    updateStats();
    addHistory({ type: "ping(sim)", target, count, time: new Date().toISOString() });
  }, 300);
}

function simulateTraceroute(target) {
  clearOutput();
  showLoader();
  appendLine(`traceroute to ${target} (simulated), 30 hops max`);
  setTimeout(() => {
    const hops = Math.floor(Math.random() * 6) + 6;
    for (let h = 1; h <= hops; h++) {
      const ip = `${10 + Math.floor(Math.random() * 200)}.${Math.floor(
        Math.random() * 255
      )}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const ms1 = (Math.random() * 80 + 5).toFixed(2);
      const ms2 = (Math.random() * 80 + 5).toFixed(2);
      const ms3 = (Math.random() * 80 + 5).toFixed(2);
      appendLine(`${h}\t${ip}\t${ms1} ms ${ms2} ms ${ms3} ms`);
      if (Math.random() > 0.82) {
        appendLine(
          `${h + 1}\t${target} (${target})\t${(Math.random() * 30 + 5).toFixed(
            2
          )} ms`
        );
        break;
      }
    }
    hideLoader();
    addHistory({ type: "traceroute(sim)", target, time: new Date().toISOString() });
  }, 300);
}

// Statistics
function updateStats() {
  const arr = chartData.datasets[0].data.filter(
    (v) => v !== null && v !== undefined
  );
  if (!arr.length) {
    document.getElementById("lastRtt").textContent = "—";
    document.getElementById("avgRtt").textContent = "—";
    document.getElementById("loss").textContent = "—";
    return;
  }
  const last = arr[arr.length - 1];
  const avg = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
  document.getElementById("lastRtt").textContent = `${last.toFixed(2)} ms`;
  document.getElementById("avgRtt").textContent = `${avg} ms`;
  const loss =
    (
      (chartData.datasets[0].data.filter((v) => v == null).length /
        chartData.datasets[0].data.length) *
      100
    ).toFixed(1) + "%";
  document.getElementById("loss").textContent = loss;
}

// History
function addHistory(item) {
  if (!autoAddHistory.checked) return;
  history.push(item);
  if (history.length > 500) history.shift();
  localStorage.setItem("netproj-history", JSON.stringify(history));
}

// Real Mode 
function runReal(command, payload) {
  clearOutput();
  showLoader();
  appendLine(`Starting ${command} on server: ${payload.target}`);

  const opId = "op-" + Date.now();
  socket.emit("start", { opId, command, payload });

  function onStream(msg) {
  if (msg.opId !== opId) return;

  if (msg.line) {
    appendLine(msg.line);
  }
"Git: Push"
  if (msg.rtt !== undefined) {
    chartData.labels.push(chartData.labels.length + 1);
    chartData.datasets[0].data.push(msg.rtt == null ? null : Number(msg.rtt));
    chart.update();
    updateStats();
  }
}


  function onDone(msg) {
    if (msg.opId !== opId) return;
    appendLine("\n-- finished --");
    hideLoader();
    addHistory({
      type: command,
      target: payload.target,
      payload,
      time: new Date().toISOString(),
    });
    socket.off("stream", onStream);
    socket.off("done", onDone);
  }

  socket.on("stream", onStream);
  socket.on("done", onDone);
}

// UI events
pingBtn.addEventListener("click", () => {
  const t = sanitizeTarget(targetInput.value);
  if (!t) return alert("Invalid target");
  const count = Math.max(1, Math.min(20, parseInt(countInput.value) || 4));
  if (modeSelect.value === "sim") simulatePing(t, count);
  else runReal("ping", { target: t, count });
});

traceBtn.addEventListener("click", () => {
  const t = sanitizeTarget(targetInput.value);
  if (!t) return alert("Invalid target");
  if (modeSelect.value === "sim") simulateTraceroute(t);
  else runReal("traceroute", { target: t, maxHops: 30 });
});

clearBtn.addEventListener("click", clearOutput);
copyBtn.addEventListener("click", () =>
  navigator.clipboard.writeText(outputEl.textContent).then(() => alert("Copied"))
);
exportBtn.addEventListener("click", () => {
  const blob = new Blob([outputEl.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `netproj-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("theme-dark");
  document.body.classList.toggle("theme-light");
  themeBtn.textContent = document.body.classList.contains("theme-dark")
    ? "🌙"
    : "🌞";
});

// Fetch IP
fetch("https://api.ipify.org?format=json")
  .then((r) => r.json())
  .then((j) => (networkInfo.textContent = "Public IP: " + j.ip))
  .catch(() => (networkInfo.textContent = "Public IP: —"));

// Check server health
fetch(BACKEND_URL + "/health")
  .then((r) => {
    if (!r.ok) throw new Error("no");
  })
  .catch(() => {
    const warn = document.createElement("div");
    warn.className = "muted small";
    warn.textContent = "Server not reachable — Real mode needs server running.";
    document.querySelector(".sidebar").appendChild(warn);
  });

// Persist history
localStorage.setItem("netproj-history", JSON.stringify(history));
