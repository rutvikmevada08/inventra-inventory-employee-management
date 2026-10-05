const ExcelJS = require("exceljs");
const { promisify } = require("util");
const fs = require("fs");
const Employee = require("./../../models/employees");
const Vendor = require("./../../models/vendors");
const Fuel = require("./../../models/fuel");
const Reimbursement = require("./../../models/reimbursement");
const Lot = require("./../../models/lots");
const Item_type = require("./../../models/item_types");
const Item = require("./../../models/items");
const Vehicle = require("./../../models/vehicles");
const ReimbursementReq = require("../../models/reimbursement_req");

const formatDateToDDMMYYYY = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const writeToExcel = async (data, fuelData, reimbursementData, res, req) => {
  try {
    data.sort((a, b) => new Date(a.Purchase_date) - new Date(b.Purchase_date));
    fuelData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    reimbursementData.sort((a, b) => new Date(a.Date) - new Date(b.Date));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    const borderStyle = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };

    worksheet.mergeCells("A3:J4");
    const headerCell = worksheet.getCell("A3");
    headerCell.value =
      "Peripheral Hardware may refer to: Mechanical Parts, 3D Printer Filament, Electronics Components, Mechanical Fabrication, Motors, Electronics Circuit Fabrication, etc -- any non-computer hardware is mentioned as peripheral hardware";
    headerCell.alignment = {
      wrapText: true,
      horizontal: "left",
      vertical: "middle"
    };
    headerCell.font = { size: 10, bold: true };
    headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2CC2D0" } };
    headerCell.border = borderStyle;

    const headers = [
      "S NO",
      "INVOICE NO.",
      "INVOICE DATE",
      "AMOUNT INR",
      "AMOUNT USD",
      "TYPE OF PRODUCT",
      "BILLED TO",
      "PAID BY",
      "REFUND STATUS",
      "PAYMENT STATUS"
    ];
    worksheet.addRow(headers).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA4FFA4" } };
      cell.font = { bold: true, size: 9 };
      cell.border = borderStyle;
    });

    let sNo = 1;
    data.forEach((item) => {
      let paymentStatus;
      if (item.Total_payable == item.Total_paid) {
        paymentStatus = `Paid`;
      } else if (item.Total_paid == 0) {
        paymentStatus = `Pending`;
      } else {
        const percent = (item.Total_paid / item.Total_payable) * 100;
        paymentStatus = `${percent.toFixed(2)}% Paid`;
      }

      const row = [
        sNo++,
        item.Invoice_number || "",
        formatDateToDDMMYYYY(item.Purchase_date) || "",
        `₹ ${item.Total_payable}` || "",
        `$ ${(item.Total_payable / 73.7).toFixed(2)}` || "",
        item.Lot_type || "Computer Hardware",
        "Swaayatt Robots Pvt Ltd.",
        item.Paid_by || "Sanjeev Sharma",
        "",
        paymentStatus || "NA"
      ];
      worksheet.addRow(row).eachCell((cell) => {
        cell.font = { size: 9 };
        cell.border = borderStyle;
      });
    });

    // Write fuel data
    const fuelStartRow = 9 + data.length;
    worksheet.mergeCells(`A${fuelStartRow}:I${fuelStartRow + 1}`);
    const fuelHeaderCell = worksheet.getCell(`A${fuelStartRow}`);
    fuelHeaderCell.value =
      "MISCELLANEOUS (FUEL): Only those fuel receipts are mentioned for which refund is already requested or may be requested in future.";
    fuelHeaderCell.style.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    fuelHeaderCell.border = borderStyle;
    fuelHeaderCell.font = { bold: true, size: 10 };
    fuelHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2CC2D0" } };

    const fuelHeaders = [
      "S_NO",
      "VENDOR/COMPANY NAME",
      "INVOICE NUMBER",
      "INVOICE DATE",
      "AMOUNT INR",
      "AMOUNT USD",
      "VEHICLE NUMBER",
      "PAID BY",
      "REFUNDED TO PERSON"
    ];
    worksheet.addRow(fuelHeaders).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA4FFA4" } };
      cell.font = { bold: true, size: 9 };
      cell.border = borderStyle;
    });

    let fSNo = 1;
    fuelData.forEach((item) => {
      const row = [
        fSNo++,
        item.Vendor.Business_name || "NA",
        item.Invoice_number || "NA",
        formatDateToDDMMYYYY(item.Date) || "NA",
        `₹ ${item.Total}` || "",
        `$ ${(item.Total / 73.7).toFixed(2)}` || "NA",
        item.Vehicle_num.Vehicle_number || "Computer Hardware",
        item.Paid_by || "Sanjeev Sharma",
        "Not Requested/May be Requested"
      ];
      worksheet.addRow(row).eachCell((cell) => {
        cell.font = { size: 9 };
        cell.border = borderStyle;
      });
    });

    // Write reimbursement data
    const reimbursementStartRow = fuelStartRow + 9 + fuelData.length;
    worksheet.mergeCells(`A${reimbursementStartRow}:H${reimbursementStartRow}`);
    const reimbursementHeaderCell = worksheet.getCell(`A${reimbursementStartRow}`);
    reimbursementHeaderCell.value =
      "All expenses paid by Sanjeev Sharma are covered by monthly average withdrawal.";
    reimbursementHeaderCell.style.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    reimbursementHeaderCell.font = { size: 10, bold: true };
    reimbursementHeaderCell.border = borderStyle;
    reimbursementHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2CC2D0" } };

    worksheet.mergeCells(`A${reimbursementStartRow + 2}:H${reimbursementStartRow + 2}`);
    const miscellaneousCell = worksheet.getCell(`A${reimbursementStartRow + 2}`);
    miscellaneousCell.value = "MISCELLANEOUS";
    miscellaneousCell.border = borderStyle;
    miscellaneousCell.font = { bold: true };
    miscellaneousCell.style.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    miscellaneousCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA4FFA4" } };

    const reimbHeaders = [
      "S_NO.",
      "VENDOR/COMPANY NAME",
      "INVOICE NO.",
      "INVOICE DATE",
      "AMOUNT INR",
      "AMOUNT USD",
      "TYPE OF MATERIAL",
      "PAID BY"
    ];
    worksheet.addRow(reimbHeaders).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA4FFA4" } };
      cell.font = { bold: true, size: 9 };
      cell.border = borderStyle;
    });

    let rSNo = 1;
    reimbursementData.forEach((item) => {
      const row = [
        rSNo++,
        item.Vendor || "NA",
        item.Invoice_number || "NA",
        formatDateToDDMMYYYY(item.Date) || "",
        `₹ ${item.Amount}` || "",
        `$ ${(item.Amount / 73.7).toFixed(2)}` || "",
        item.reason || "Computer Hardware",
        item.Paid_by || "Sanjeev Sharma"
      ];
      worksheet.addRow(row).eachCell((cell) => {
        cell.font = { size: 9 };
        cell.border = borderStyle;
      });
    });

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
      });
    });

    const columnWidths = [
      { width: 6 }, // 1
      { width: 28 }, // 2
      { width: 20 }, //3
      { width: 14 }, // 4
      { width: 14 }, // 5
      { width: 20 }, // 6
      { width: 25 }, //7
      { width: 18 }, // 8
      { width: 30 }, // 9
      { width: 18 } // 10
    ];
    worksheet.columns = columnWidths;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Investor_sheet.xlsx");

    await workbook.xlsx.write(res);
    console.log("Excel file sent successfully.");
    res.end();
  } catch (error) {
    console.error("Error sending Excel file:", error);
    req.flash("error", "Something went wrong while generating the Excel file.");
    res.redirect("/get-sheets");
  }
};

module.exports = writeToExcel;
