const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { authenticateToken, requireAdmin, JWT_SECRET } = require("../../middleware/auth");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "This account has been deactivated. Please contact an administrator." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error during login." });
  }
});

// GET /api/auth/me
router.get("/me", authenticateToken, async (req, res) => {
  try {
    return res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error fetching user profile." });
  }
});

// POST /api/auth/change-password
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password does not match." });
    }

    user.password = await User.hashPassword(newPassword);
    await user.save();

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Internal server error updating password." });
  }
});

// GET /api/auth/users (Admin only)
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch users." });
  }
});

// POST /api/auth/users (Admin only)
router.post("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }

    const hashedPassword = await User.hashPassword(password);
    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role === "admin" ? "admin" : "staff",
      phone: phone ? phone.trim() : "",
      isActive: true,
    });

    await newUser.save();
    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ error: "Failed to create user." });
  }
});

// PATCH /api/auth/users/:id/toggle (Admin only)
router.patch("/users/:id/toggle", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    // Prevent admin from deactivating themselves
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot deactivate your own account." });
    }

    targetUser.isActive = !targetUser.isActive;
    await targetUser.save();

    return res.json({
      message: `User ${targetUser.isActive ? "activated" : "deactivated"} successfully.`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update user status." });
  }
});

module.exports = router;
