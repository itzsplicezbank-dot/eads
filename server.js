const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

fs.ensureDirSync("uploads");
fs.ensureDirSync("data");

const DB_FILE = "data/db.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { folders: [{ name: "Default", videos: [] }], activeFolder: 0 };
  }
  return fs.readJsonSync(DB_FILE);
}

function saveDB(db) {
  fs.writeJsonSync(DB_FILE, db);
}

let db = loadDB();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

app.get("/api/db", (req, res) => {
  db = loadDB();
  res.json(db);
});

app.post("/api/folder", (req, res) => {
  const { name } = req.body;
  db = loadDB();

  db.folders.push({ name, videos: [] });
  saveDB(db);

  res.json(db);
});

app.post("/api/upload", upload.single("video"), (req, res) => {
  const { folderIndex } = req.body;

  db = loadDB();

  db.folders[folderIndex].videos.push({
    name: req.file.filename,
    src: "/uploads/" + req.file.filename
  });

  saveDB(db);

  res.json(db);
});

app.delete("/api/video", (req, res) => {
  const { folderIndex, videoIndex } = req.body;

  db = loadDB();

  const video = db.folders[folderIndex].videos[videoIndex];
  if (video) {
    const filePath = path.join(__dirname, video.src);
    fs.removeSync(filePath);
  }

  db.folders[folderIndex].videos.splice(videoIndex, 1);
  saveDB(db);

  res.json(db);
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
