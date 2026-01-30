const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
console.log('CWD:', cwd);

const paths = [
    'a:\\EqsciProject\\backend\\src\\schools\\school65.xlsx',
    path.join(cwd, 'src', 'schools', 'school65.xlsx'),
    path.join(cwd, 'school65.xlsx'),
    path.join(__dirname, 'src', 'schools', 'school65.xlsx')
];

paths.forEach(p => {
    console.log(`Checking: ${p} -> ${fs.existsSync(p) ? 'FOUND' : 'MISSING'}`);
});
