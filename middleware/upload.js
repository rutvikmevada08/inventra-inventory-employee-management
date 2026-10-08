const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate collision-safe filename
    const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    // Clean original name to prevent directory traversal
    const cleanExt = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, cleanExt)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    cb(null, `${uniqueSuffix}_${baseName}${cleanExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".xlsx", ".xls", ".doc", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed (${ext}). Allowed: JPG, PNG, PDF, XLSX, DOC.`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter: fileFilter,
});

module.exports = upload;
