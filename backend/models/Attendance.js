const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['Present', 'Half Day', 'Absent', 'Leave'],
      required: [true, 'Status is required'],
    },
    eligibleDays: {
      type: Number,
      required: true,
      default: function () {
        if (this.status === 'Present') return 1.0;
        if (this.status === 'Half Day') return 0.5;
        return 0.0;
      },
    },
    note: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

attendanceSchema.pre('validate', function (next) {
  if (this.status === 'Present') {
    this.eligibleDays = 1.0;
  } else if (this.status === 'Half Day') {
    this.eligibleDays = 0.5;
  } else {
    this.eligibleDays = 0.0;
  }
  next();
});

// Prevent duplicate attendance for the same employee on the same date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
