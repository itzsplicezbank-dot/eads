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

function defaultDB() {
  return {
    folders: [
      {
        name: "Default",
        videos: []
      }
    ]
  };
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const db = defaultDB();
    fs.writeJsonSync(DB_FILE, db);
    return db;
  }
  return fs.readJsonSync(DB_FILE);
}

function saveDB(db) {
  fs.writeJsonSync(DB_FILE, db);
}

function getFolder(db, index) {
  if (!db.folders || db.folders.length === 0) {
    db.folders = defaultDB().folders;
  }
  if (!db.folders[index]) return db.folders[0];
  return db.folders[index];
}

function safeIndex(i) {
  return isNaN(i) ? 0 : Number(i);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

app.get("/api/db", (req, res) => {
  const db = loadDB();
  res.json(db);
});

app.post("/api/folder", (req, res) => {
  const db = loadDB();

  let name = (req.body.name || "New Folder").trim();
  if (!name) name = "New Folder";

  const exists = db.folders.some(f => f.name === name);
  if (exists) {
    name = name + " " + (db.folders.length + 1);
  }

  db.folders.push({
    name,
    videos: []
  });

  saveDB(db);
  res.json(db);
});

app.post("/api/delete-folder", (req, res) => {
  const db = loadDB();

  const index = safeIndex(req.body.folderIndex);

  if (index === 0) {
    return res.json(db);
  }

  const folder = db.folders[index];
  if (!folder) return res.json(db);

  folder.videos.forEach(v => {
    const filePath = path.join(__dirname, v.src);
    if (fs.existsSync(filePath)) {
      fs.removeSync(filePath);
    }
  });

  db.folders.splice(index, 1);

  saveDB(db);
  res.json(db);
});

app.post("/api/upload", upload.single("video"), (req, res) => {
  const db = loadDB();

  const folderIndex = safeIndex(req.body.folderIndex);
  const folder = getFolder(db, folderIndex);

  const number = folder.videos.length + 1;

  folder.videos.push({
    name: `Video ${number}`,
    number,
    src: "/uploads/" + req.file.filename
  });

  saveDB(db);
  res.json(db);
});

app.post("/api/delete", (req, res) => {
  const db = loadDB();

  const folderIndex = safeIndex(req.body.folderIndex);
  const videoIndex = safeIndex(req.body.videoIndex);

  const folder = getFolder(db, folderIndex);
  const video = folder.videos[videoIndex];

  if (video) {
    const filePath = path.join(__dirname, video.src);
    if (fs.existsSync(filePath)) {
      fs.removeSync(filePath);
    }
  }

  folder.videos.splice(videoIndex, 1);

  saveDB(db);
  res.json(db);
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
