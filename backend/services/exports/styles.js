const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const centered = { wrapText: true, horizontal: 'center', vertical: 'middle' };

const fmtDate = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
};

// Same look as the old sheets: teal banner rows, green header rows, thin borders.
function banner(ws, text, lastCol, rows = 1) {
  const r = ws.rowCount + 1;
  ws.mergeCells(`A${r}:${lastCol}${r + rows - 1}`);
  const cell = ws.getCell(`A${r}`);
  cell.value = text;
  cell.alignment = centered;
  cell.font = { bold: true, size: 10 };
  cell.fill = fill('FF2CC2D0');
  cell.border = border;
  ws.addRows(Array.from({ length: rows - 1 }, () => []));
}

function headerRow(ws, headers) {
  ws.addRow(headers).eachCell((c) => {
    c.fill = fill('FFA4FFA4');
    c.font = { bold: true, size: 9 };
    c.border = border;
    c.alignment = centered;
  });
}

function dataRow(ws, values, bold = false) {
  ws.addRow(values).eachCell((c) => {
    c.font = { size: 9, bold };
    c.border = border;
    c.alignment = centered;
  });
}

// Positional versions: the investor sheet keeps the original fixed row layout.
function placeBanner(ws, row, lastCol, text, { rows = 1, green = false } = {}) {
  ws.mergeCells(`A${row}:${lastCol}${row + rows - 1}`);
  const cell = ws.getCell(`A${row}`);
  cell.value = text;
  cell.alignment = centered;
  cell.font = { bold: true, size: 10 };
  cell.fill = fill(green ? 'FFA4FFA4' : 'FF2CC2D0');
  cell.border = border;
}

function placeHeader(ws, row, headers) {
  headers.forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h;
    c.fill = fill('FFA4FFA4');
    c.font = { bold: true, size: 9 };
    c.border = border;
    c.alignment = centered;
  });
}

function placeRow(ws, row, values) {
  values.forEach((v, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = v;
    c.font = { size: 9 };
    c.border = border;
    c.alignment = centered;
  });
}

module.exports = { fmtDate, banner, headerRow, dataRow, centered, placeBanner, placeHeader, placeRow };
