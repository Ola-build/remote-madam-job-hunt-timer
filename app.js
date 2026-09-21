require("dotenv").config();

const http = require("http");
const fs = require("fs");
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const DATA_SOURCE_ID = "3d5d3af6-a7ad-803a-95e1-000bc94bf1b7";
const STATE_FILE = ".timer-state.json";
const PORT = process.env.PORT || 3000;

const activities = [
  "Job Search",
  "Applications",
  "Follow-Up",
  "Interview Preparation",
  "Skill Improvement",
  "CV / Portfolio",
  "Networking",
  "Other",
];

function localDate(date) {
  return date.toLocaleDateString("en-CA");
}

function localDateTime(date) {
  const pad = (n) => String(n).padStart(2, "0");

  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = pad(Math.floor(Math.abs(offset) / 60));
  const minutes = pad(Math.abs(offset) % 60);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}${sign}${hours}:${minutes}`;
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function clearState() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
  });

  res.end(JSON.stringify(data));
}

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>Remote Madam | Job Hunt Timer</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Arial, sans-serif;
      background: #111111;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .container {
      width: 100%;
      max-width: 520px;
      padding: 30px;
    }

    .card {
      background: #1b1b1b;
      border: 1px solid #333;
      border-radius: 20px;
      padding: 35px;
      box-shadow: 0 20px 60px rgba(0,0,0,.35);
    }

    .logo {
      color: #A62290;
      font-weight: bold;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    h1 {
      margin: 0;
      font-size: 30px;
    }

    .subtitle {
      color: #999;
      margin-top: 10px;
      margin-bottom: 30px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #bbb;
      font-size: 14px;
    }

    select {
      width: 100%;
      padding: 15px;
      border-radius: 10px;
      border: 1px solid #444;
      background: #111;
      color: white;
      font-size: 16px;
      margin-bottom: 20px;
    }

    button {
      width: 100%;
      padding: 16px;
      border: 0;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    }

    #startBtn {
      background: #A62290;
      color: white;
    }

    #stopBtn {
      background: #333;
      color: white;
      margin-top: 10px;
    }

    button:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    .timer {
      text-align: center;
      margin: 30px 0;
    }

    .time {
      font-size: 52px;
      font-weight: bold;
      letter-spacing: 2px;
    }

    .activity {
      color: #A62290;
      font-size: 18px;
      margin-top: 8px;
    }

    .status {
      text-align: center;
      margin-top: 20px;
      color: #999;
      min-height: 22px;
    }

    .running {
      color: #67e8a5;
    }
  </style>
</head>

<body>

  <div class="container">

    <div class="card">

      <div class="logo">REMOTE MADAM</div>

      <h1>Job Hunt Timer</h1>

      <div class="subtitle">
        Track your job-hunting time without leaving your journal.
      </div>

      <label for="activity">What are you working on?</label>

      <select id="activity">
        <option>Job Search</option>
        <option>Applications</option>
        <option>Follow-Up</option>
        <option>Interview Preparation</option>
        <option>Skill Improvement</option>
        <option>CV / Portfolio</option>
        <option>Networking</option>
        <option>Other</option>
      </select>

      <div class="timer">

        <div class="time" id="time">
          00:00:00
        </div>

        <div class="activity" id="currentActivity">
          Ready to start
        </div>

      </div>

      <button id="startBtn" onclick="startTimer()">
        START TIMER
      </button>

      <button id="stopBtn" onclick="stopTimer()" disabled>
        STOP TIMER
      </button>

      <div class="status" id="status"></div>

    </div>

  </div>

<script>

let timerInterval = null;
let startTimestamp = null;

function formatTime(seconds) {

  const hrs = Math.floor(seconds / 3600);

  const mins = Math.floor((seconds % 3600) / 60);

  const secs = seconds % 60;

  return [
    hrs,
    mins,
    secs
  ]
  .map(value => String(value).padStart(2, "0"))
  .join(":");
}

function updateTimer() {

  if (!startTimestamp) return;

  const seconds = Math.floor(
    (Date.now() - startTimestamp) / 1000
  );

  document.getElementById("time").textContent =
    formatTime(seconds);
}

async function startTimer() {

  const activity =
    document.getElementById("activity").value;

  const response = await fetch("/start", {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      activity
    })

  });

  const data = await response.json();

  if (!data.success) {

    document.getElementById("status").textContent =
      data.message;

    return;
  }

  startTimestamp = Date.now();

  document.getElementById("currentActivity").textContent =
    activity;

  document.getElementById("status").textContent =
    "Timer running...";

  document.getElementById("status").className =
    "status running";

  document.getElementById("startBtn").disabled = true;

  document.getElementById("stopBtn").disabled = false;

  document.getElementById("activity").disabled = true;

  timerInterval = setInterval(
    updateTimer,
    1000
  );
}

async function stopTimer() {

  const response = await fetch("/stop", {
    method: "POST"
  });

  const data = await response.json();

  if (!data.success) {

    document.getElementById("status").textContent =
      data.message;

    return;
  }

  clearInterval(timerInterval);

  timerInterval = null;

  startTimestamp = null;

  document.getElementById("time").textContent =
    "00:00:00";

  document.getElementById("currentActivity").textContent =
    "Ready to start";

  document.getElementById("status").textContent =
    "Saved to Notion ✓";

  document.getElementById("status").className =
    "status running";

  document.getElementById("startBtn").disabled = false;

  document.getElementById("stopBtn").disabled = true;

  document.getElementById("activity").disabled = false;
}

async function checkStatus() {

  const response = await fetch("/status");

  const data = await response.json();

  if (!data.running) return;

  startTimestamp = data.startTime;

  document.getElementById("currentActivity").textContent =
    data.activity;

  document.getElementById("status").textContent =
    "Timer running...";

  document.getElementById("status").className =
    "status running";

  document.getElementById("startBtn").disabled = true;

  document.getElementById("stopBtn").disabled = false;

  document.getElementById("activity").disabled = true;

  timerInterval = setInterval(
    updateTimer,
    1000
  );
}

checkStatus();

</script>

</body>
</html>
`;

const server = http.createServer(async (req, res) => {

  if (req.method === "GET" && req.url === "/") {

    res.writeHead(200, {
      "Content-Type": "text/html"
    });

    res.end(html);

    return;
  }

  if (req.method === "GET" && req.url === "/status") {

    const state = loadState();

    if (!state) {
      sendJSON(res, {
        running: false
      });
      return;
    }

    sendJSON(res, {
      running: true,
      activity: state.activity,
      startTime: state.startTime
    });

    return;
  }

  if (req.method === "POST" && req.url === "/start") {

    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {

      try {

        const existing = loadState();

        if (existing) {

          sendJSON(res, {
            success: false,
            message: "A timer is already running."
          });

          return;
        }

        const { activity } = JSON.parse(body);

        if (!activities.includes(activity)) {

          sendJSON(res, {
            success: false,
            message: "Invalid activity."
          });

          return;
        }

        const start = new Date();

        const page = await notion.pages.create({

          parent: {
            data_source_id: DATA_SOURCE_ID
          },

          properties: {

            Name: {
              title: [
                {
                  text: {
                    content: activity
                  }
                }
              ]
            },

            "📅 Date": {
              date: {
                start: localDate(start)
              }
            },

            "🎯 Activity": {
              select: {
                name: activity
              }
            },

            "🟢 Start Time": {
              date: {
                start: localDateTime(start)
              }
            },

            "✅ Completed": {
              checkbox: false
            },

            "⏱️ Duration": {
              number: 0
            }

          }

        });

        saveState({

          pageId: page.id,

          activity,

          startTime: start.getTime()

        });

        sendJSON(res, {
          success: true
        });

      } catch (error) {

        sendJSON(res, {
          success: false,
          message: error.body?.message || error.message
        }, 500);

      }

    });

    return;
  }

  if (req.method === "POST" && req.url === "/stop") {

    try {

      const state = loadState();

      if (!state) {

        sendJSON(res, {
          success: false,
          message: "No timer is running."
        });

        return;
      }

      const end = new Date();

      const durationMinutes = Math.round(
        (end.getTime() - state.startTime) / 60000
      );

      await notion.pages.update({

        page_id: state.pageId,

        properties: {

          "🔴 End Time": {
            date: {
              start: localDateTime(end)
            }
          },

          "⏱️ Duration": {
            number: durationMinutes
          },

          "✅ Completed": {
            checkbox: true
          }

        }

      });

      clearState();

      sendJSON(res, {
        success: true,
        duration: durationMinutes
      });

    } catch (error) {

      sendJSON(res, {
        success: false,
        message: error.body?.message || error.message
      }, 500);

    }

    return;
  }

  res.writeHead(404);
  res.end("Not found");

});

server.listen(PORT, "0.0.0.0", () => {

  console.log("");
  console.log("======================================");
  console.log(" REMOTE MADAM JOB HUNT TIMER");
  console.log("======================================");
  console.log("");
  console.log(`Open your browser at:`);
  console.log(`http://localhost:${PORT}`);
  console.log("");
  console.log("Keep this terminal window running.");
  console.log("");

});