import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Base folders
const BASE_DIR = path.join(__dirname, "..", "digitalContents");
const VIDEO_DIR = path.join(BASE_DIR, "videos");
const PHOTO_DIR = path.join(BASE_DIR, "photos");
const DOC_DIR = path.join(BASE_DIR, "documents");

// Ensure folders exist
[BASE_DIR, VIDEO_DIR, PHOTO_DIR, DOC_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Allowed document extensions
const DOC_EXTS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx"]);

// Multer storage: choose destination by mimetype/extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mt = (file.mimetype || "").toLowerCase();
    let dest = DOC_DIR;

    if (mt.startsWith("video/")) dest = VIDEO_DIR;
    else if (mt.startsWith("image/")) dest = PHOTO_DIR;
    else {
      const ext = path.extname(file.originalname).toLowerCase();
      if (DOC_EXTS.has(ext)) dest = DOC_DIR;
      else dest = DOC_DIR; // fallback
    }

    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\.-]/g, "");
    const timestamp = Date.now();
    cb(null, `${timestamp}_${safeName}`);
  },
});

// File filter: allow video/*, image/* and specified document extensions
const fileFilter = (req, file, cb) => {
  const mt = (file.mimetype || "").toLowerCase();
  if (mt.startsWith("video/") || mt.startsWith("image/")) return cb(null, true);

  const ext = path.extname(file.originalname).toLowerCase();
  if (DOC_EXTS.has(ext)) return cb(null, true);

  return cb(new Error("Unsupported file type"), false);
};

// Limits (adjust as needed)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300 MB per file
});

// Accept multiple files under field name "files"
router.post("/upload", upload.array("files", 20), async (req, res) => {
    console.log("Upload request received");
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "No files uploaded" });

    const uploaded = files.map((f) => {
      const relPath = path.relative(path.join(__dirname, ".."), f.path).split(path.sep).join("/");
      return {
        originalName: f.originalname,
        storedName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        relativePath: relPath,
        fullPath: f.path,
      };
    });

    return res.status(200).json({ uploaded });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /files - list all uploaded files grouped by category
router.get("/files", (req, res) => {
  try {
    const readFiles = (dir) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir, { withFileTypes: true })
        .filter(d => d.isFile())
        .map(d => {
          const fullPath = path.join(dir, d.name);
          const relPath = path.relative(path.join(__dirname, ".."), fullPath).split(path.sep).join("/");
          const stat = fs.statSync(fullPath);
          return {
            name: d.name,
            relativePath: relPath,
            fullPath,
            size: stat.size,
            ext: path.extname(d.name).toLowerCase()
          };
        });
    };

    const videos = readFiles(VIDEO_DIR);
    const photos = readFiles(PHOTO_DIR);
    const documents = readFiles(DOC_DIR);

    return res.status(200).json({ videos, photos, documents });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /download - download or view a file by relative path
router.get("/download", (req, res) => {
  try {
    const relativePath = req.query.path; // e.g., digitalContents/documents/1761113483488_12.xlsx
    if (!relativePath) {
      return res.status(400).json({ error: "File path is required in the query parameter 'path'" });
    }

    // Resolve the full path
    const fullPath = path.join(__dirname, "..", relativePath);

    // Check if the file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Send the file for download
    res.download(fullPath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ error: "Failed to download the file" });
      }
    });
  } catch (err) {
    console.error("Error in download endpoint:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;