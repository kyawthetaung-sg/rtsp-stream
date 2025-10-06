const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");

const app = express();

const PORT = process.env.PORT || 3000;
const RTSP_URL = "rtsp://103.144.9.10:554/0";
const STREAM_DIR = path.join(__dirname, "streams");
const PUBLIC_DIR = path.join(__dirname, "public");
const HLS_FILE = path.join(STREAM_DIR, "camera.m3u8");

app.use(cors());
app.use(express.static(PUBLIC_DIR));
app.use("/streams", express.static(STREAM_DIR));

if (!fs.existsSync(STREAM_DIR)) {
  fs.mkdirSync(STREAM_DIR);
  console.log("Created streams folder");
}

const startStream = () => {
  console.log("Starting RTSP to HLS stream...");

  const ffmpegProcess = ffmpeg()
    .setFfmpegPath(ffmpegPath)
    .input(RTSP_URL)
    .inputOptions(["-rtsp_transport", "tcp", "-buffer_size", "102400"])
    .outputOptions([
      "-c:v libx264",
      "-preset ultrafast",
      "-tune zerolatency",
      "-profile:v baseline",
      "-level 3.0",
      "-c:a aac",
      "-f hls",
      "-hls_time 2",
      "-hls_list_size 5",
      "-hls_flags delete_segments",
    ])
    .output(HLS_FILE)
    .on("start", (cmd) => console.log("FFmpeg started:", cmd))
    .on("error", (err) => {
      console.error("FFmpeg error:", err.message);
      console.log("Retrying in 5 seconds...");
      setTimeout(startStream, 5000); // Auto-restart if crashed
    })
    .on("end", () => {
      console.log("FFmpeg stream ended. Restarting...");
      setTimeout(startStream, 5000);
    })
    .run();
};

startStream();

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "player.html"));
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", stream: fs.existsSync(HLS_FILE) });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🟢 HLS Stream: http://localhost:${PORT}/streams/camera.m3u8`);
});
