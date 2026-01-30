
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'a:\\EqsciProject\\excel\\ข้อมูลนักเรียนทั้งหมด.xlsx';

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    let output = `--- Excel Summary Report ---\n`;
    output += `File: ${path.basename(filePath)}\n`;
    output += `Total Rows: ${data.length}\n`;

    if (data.length > 0) {
        const columns = Object.keys(data[0]);
        output += `Columns: ${columns.join(', ')}\n`;

        // Analysis
        const levelCounts = {};

        data.forEach(row => {
            const level = row['ระดับชั้น'] || row['Level'] || row['Class'] || 'Unknown';
            levelCounts[level] = (levelCounts[level] || 0) + 1;
        });

        output += '\n--- Student Counts by Level ---\n';
        output += JSON.stringify(levelCounts, null, 2) + '\n';

        output += '\n--- Sample Data (First 3 Rows) ---\n';
        output += JSON.stringify(data.slice(0, 3), null, 2) + '\n';
    } else {
        output += 'Sheet is empty.\n';
    }

    fs.writeFileSync(path.join(__dirname, 'excel_summary.txt'), output);
    console.log('Summary written to excel_summary.txt');

} catch (error) {
    console.error('Error reading Excel file:', error);
    fs.writeFileSync(path.join(__dirname, 'excel_summary.txt'), `Error: ${error.message}`);
}
