const express = require("express");
const path = require("path");
const cors = require("cors");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/streams", express.static(path.join(__dirname, "streams")));

const RTSP_URL = "rtsp://103.144.9.10:554/0";
const HLS_PATH = path.join(__dirname, "streams", "camera.m3u8");

if (!fs.existsSync(path.join(__dirname, "streams"))) {
  fs.mkdirSync(path.join(__dirname, "streams"));
}

ffmpeg()
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
  .output(HLS_PATH)
  .on("start", () => console.log("FFmpeg started streaming..."))
  .on("error", (err) => console.error("FFmpeg error:", err.message))
  .run();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "player.html"));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
