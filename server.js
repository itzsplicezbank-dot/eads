const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

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

/* ---------- FILE UPLOAD ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* ---------- API ---------- */

// get app data
app.get("/api/db", (req, res) => {
  res.json(loadDB());
});

// create folder
app.post("/api/folder", (req, res) => {
  const { name } = req.body;

  db = loadDB();
  db.folders.push({ name, videos: [] });

  saveDB(db);
  res.json(db);
});

// upload video
app.post("/api/upload", upload.single("video"), (req, res) => {
  const { folderIndex } = req.body;

  db = loadDB();

  const filePath = "/uploads/" + req.file.filename;

  db.folders[folderIndex].videos.push({
    name: req.file.originalname,
    src: filePath
  });

  saveDB(db);
  res.json(db);
});

// delete video
app.post("/api/delete", (req, res) => {
  const { folderIndex, videoIndex } = req.body;

  db = loadDB();

  const video = db.folders[folderIndex].videos[videoIndex];

  if (video) {
    const fullPath = path.join(__dirname, video.src);
    if (fs.existsSync(fullPath)) fs.removeSync(fullPath);
  }

  db.folders[folderIndex].videos.splice(videoIndex, 1);

  saveDB(db);
  res.json(db);
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
