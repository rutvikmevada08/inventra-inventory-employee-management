require("dotenv").config();
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var fs = require("fs");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
const session = require("express-session");
const flush = require("connect-flash");

// Modern API Routers
const authApiRouter = require("./routes/api/auth");
const employeesApiRouter = require("./routes/api/employees");
const attendanceApiRouter = require("./routes/api/attendance");
const payrollApiRouter = require("./routes/api/payroll");
const advancesApiRouter = require("./routes/api/advances");
const paymentsApiRouter = require("./routes/api/payments");
const inventoryApiRouter = require("./routes/api/inventory");
const itemRequestsApiRouter = require("./routes/api/itemRequests");
const vendorsApiRouter = require("./routes/api/vendors");
const vehiclesApiRouter = require("./routes/api/vehicles");
const fuelApiRouter = require("./routes/api/fuel");
const reimbursementsApiRouter = require("./routes/api/reimbursements");
const expensesApiRouter = require("./routes/api/expenses");
const dashboardApiRouter = require("./routes/api/dashboard");
const reportsApiRouter = require("./routes/api/reports");
const filesApiRouter = require("./routes/api/files");

// Legacy Routers
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();

// View engine setup for legacy pages
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Enable CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);

if (process.env.NODE_ENV !== "test") {
  app.use(logger("dev"));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(flush());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_inventory_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 },
  })
);

// Mount Modern REST APIs
app.use("/api/auth", authApiRouter);
app.use("/api/employees", employeesApiRouter);
app.use("/api/attendance", attendanceApiRouter);
app.use("/api/payroll", payrollApiRouter);
app.use("/api/advances", advancesApiRouter);
app.use("/api/payments", paymentsApiRouter);
app.use("/api/inventory", inventoryApiRouter);
app.use("/api/item-requests", itemRequestsApiRouter);
app.use("/api/vendors", vendorsApiRouter);
app.use("/api/vehicles", vehiclesApiRouter);
app.use("/api/fuel", fuelApiRouter);
app.use("/api/reimbursements", reimbursementsApiRouter);
app.use("/api/expenses", expensesApiRouter);
app.use("/api/dashboard", dashboardApiRouter);
app.use("/api/reports", reportsApiRouter);
app.use("/api/files", filesApiRouter);

// Serve React Frontend Production Build if present
const frontendDist = path.join(__dirname, "frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    // If request is not an API call or static file, serve index.html for SPA routing
    if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
      return res.sendFile(path.join(frontendDist, "index.html"));
    }
    next();
  });
}

// Mount Legacy Routes
app.use("/", indexRouter);
app.use("/users", usersRouter);

// Catch 404 for API requests as JSON, and other requests
app.use(function (req, res, next) {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Endpoint not found" });
  }
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  if (req.path.startsWith("/api")) {
    console.error("API Error:", err);
    return res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
    });
  }

  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
