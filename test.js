const ExcelJS = require('exceljs');

// Create Excel workbook and worksheet
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Data');

// Sample JavaScript object
const data = [
    { name: 'John', age: 30, city: 'New York' },
    { name: 'Alice', age: 25, city: 'Los Angeles' },
    { name: 'Bob', age: 35, city: 'Chicago' }
];


// Write data to Excel worksheet          
function writeToExcel(data) {
    // Write headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Write rows
    data.forEach(row => {
        const values = Object.values(row);

        worksheet.addRow(values);
        console.log(values)
    });

  // Save Excel file
    workbook.xlsx.writeFile('output.xlsx')
        .then(() => {
            console.log('Excel file created successfully.');
        })
        .catch(error => {
            console.error('Error writing to Excel:', error);
        });
}

// Call the function to write data to Excel
writeToExcel(data);
