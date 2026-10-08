const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: "Operations",
    },
    designation: {
      type: String,
      trim: true,
      default: "Worker",
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    employmentType: {
      type: String,
      enum: ["Daily Wage", "Monthly Salaried", "Contract"],
      default: "Daily Wage",
    },
    dailyWage: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlySalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deactivationReason: {
      type: String,
      trim: true,
    },
    deactivationDate: {
      type: Date,
    },
    // Legacy support fields
    Name: {
      type: String,
    },
    Email: {
      type: String,
    },
    Number: {
      type: Number,
    },
    Password: {
      type: String,
    },
  },
  { timestamps: true }
);

// Pre-save hook to synchronize legacy fields and ensure employeeId
employeeSchema.pre("save", function (next) {
  if (this.name && !this.Name) this.Name = this.name;
  if (this.Name && !this.name) this.name = this.Name;

  if (this.email && !this.Email) this.Email = this.email;
  if (this.Email && !this.email) this.email = this.Email;

  if (this.phone && !this.Number && !isNaN(this.phone)) this.Number = Number(this.phone);
  if (this.Number && !this.phone) this.phone = String(this.Number);

  if (!this.employeeId) {
    this.employeeId = "EMP-" + (this._id ? this._id.toString().slice(-6).toUpperCase() : Math.floor(100000 + Math.random() * 900000));
  }
  next();
});

module.exports = mongoose.models.employee || mongoose.model("employee", employeeSchema);