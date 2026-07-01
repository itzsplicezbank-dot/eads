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

/* ---------- DB ---------- */
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { folders: [{ name: "Default", videos: [] }] };
  }
  return fs.readJsonSync(DB_FILE);
}

function saveDB(db) {
  fs.writeJsonSync(DB_FILE, db);
}

/* ---------- UPLOAD ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* ---------- API ---------- */

// get db
app.get("/api/db", (req, res) => {
  res.json(loadDB());
});

// upload
app.post("/api/upload", upload.single("video"), (req, res) => {
  const db = loadDB();

  const folderIndex = Number(req.body.folderIndex || 0);
  const folder = db.folders[folderIndex];

  const number = folder.videos.length + 1;

  folder.videos.push({
    name: `Video ${number}`,
    number,
    src: "/uploads/" + req.file.filename
  });

  saveDB(db);
  res.json(db);
});

// delete
app.post("/api/delete", (req, res) => {
  const db = loadDB();

  const { folderIndex, videoIndex } = req.body;

  const video = db.folders[folderIndex]?.videos[videoIndex];

  if (video) {
    const filePath = path.join(__dirname, video.src);
    if (fs.existsSync(filePath)) fs.removeSync(filePath);
  }

  db.folders[folderIndex].videos.splice(videoIndex, 1);

  saveDB(db);
  res.json(db);
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
