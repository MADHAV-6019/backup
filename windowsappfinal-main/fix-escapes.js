const fs = require('fs');
let code = fs.readFileSync('frontend/phantom-features.js', 'utf-8');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync('frontend/phantom-features.js', code);
