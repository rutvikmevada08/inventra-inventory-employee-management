const ExcelJS = require("exceljs");

function formatDateToDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

const write_inventory_data = (data, res, req) => {
  let s_no = 1;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");

  // adding multiple empty rows

  worksheet.addRow([]);
  worksheet.addRow([]);

  // merging cells and giving headers.
  const borderStyle = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  worksheet.mergeCells("A3:J3");
  const cell = worksheet.getCell("A3");
  cell.value =
    "Peripheral Hardware may refer to: Mechanical Parts, 3D Printer Filament, Electronics Components, Mechanical Fabrication, Motors, Electronics Circuit Fabrication, etc -- any non-computer hardware is mentioned as peripheral hardware";
  cell.alignment = {
    wrapText: true,
    horizontal: "center",
    vertical: "middle",
  };
  cell.font = { size: 10, bold: true };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "2CC2D0" },
  };
  cell.border = borderStyle;

  // defining headers
  const headers = [
    "S NO",
    "INVOICE NO.",
    "PURCHASE DATE",
    "VENDOR",
    "ITEM",
    "COST PER UNIT",
    "QUANTITY",
    "AMOUNT",
    "PURPOSE",
  ];
  worksheet.addRow(headers).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFA4FFA4" },
    };
    cell.font = {
      bold: true,
      size: 9,
    };
    cell.border = borderStyle;
    cell.alignment = {
      wrapText: true,
      horizontal: "center",
      vertical: "middle",
    };
  });

  data.forEach((item) => {
    const row = [
      s_no++,

      item.Invoice_number || "",
      formatDateToDDMMYYYY(item.Purchase_date) || "",
      item.Vendor.Business_name || "",
    ];

    worksheet.addRow(row).eachCell((cell, colNumber) => {
      cell.font = { size: 9 };
      cell.border = borderStyle;
      cell.alignment = {
        wrapText: true,
        horizontal: "center",
        vertical: "middle",
      };
    });

    var t = 0;
    item.Items.forEach((vastu) => {
      var rowVastu = [
        "",
        "",
        "",
        "",

        vastu.Item_type.Type_name || "",
        vastu.Cost_per_unit || "",
        vastu.Quantity || "",
        vastu.Total_payable || "",
      ];
      t = t + vastu.Total_payable;
      worksheet.addRow(rowVastu).eachCell((cell, colNumber) => {
        cell.font = { size: 9 };
        cell.border = borderStyle;
        cell.alignment = {
          wrapText: true,
          horizontal: "center",
          vertical: "middle",
        };
      });
    });
    var total_row = ["", "", "", "", "", "", "Total", t];
    worksheet.addRow(total_row).eachCell((cell, colNumber) => {
      cell.font = { size: 9, bold: true };
      cell.border = borderStyle;
      cell.alignment = {
        wrapText: true,
        horizontal: "center",
        vertical: "middle",
      };
    });
  });
  const columnWidths = [
    { width: 6 },
    { width: 28 },
    { width: 20 },
    { width: 20 },
    { width: 14 },
    { width: 20 },
    { width: 25 },
    { width: 18 },
    { width: 30 },
    { width: 18 },
  ];
  worksheet.columns = columnWidths;
  // Save Excel file
  let d = new Date();
  d = formatDateToDDMMYYYY(d);
  req.flash("message", "The investor sheet is being downloaded");
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${d}_Inventory_sheet.xlsx`
  );

  // Send the Excel file as a response
  workbook.xlsx
    .write(res)
    .then(() => {
      console.log("Excel file sent successfully.");
      res.end();
    })
    .catch((error) => {
      console.error("Error sending Excel file:", error);
      res.status(500).send("Error sending Excel file.");
    });
};

module.exports = write_inventory_data;
