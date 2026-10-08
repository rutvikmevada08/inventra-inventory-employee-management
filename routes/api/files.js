const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { JWT_SECRET } = require("../../middleware/auth");

// GET /api/files/uploads/:filename (Secure authorized document delivery)
router.get("/uploads/:filename", async (req, res) => {
  try {
    const filename = path.basename(req.params.filename); // Protect against directory traversal
    const filePath = path.join(__dirname, "../../public/uploads", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Requested document was not found." });
    }

    // Verify token from header OR query param (?token=xyz)
    let token = null;
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: "Access denied: authentication token required to view document." });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(403).json({ error: "Access denied: inactive or invalid account." });
      }
    } catch (err) {
      return res.status(401).json({ error: "Access denied: invalid or expired token." });
    }

    // Serve file safely with appropriate mime type
    return res.sendFile(filePath);
  } catch (error) {
    console.error("File delivery error:", error);
    return res.status(500).json({ error: "Internal server error retrieving document." });
  }
});

module.exports = router;
