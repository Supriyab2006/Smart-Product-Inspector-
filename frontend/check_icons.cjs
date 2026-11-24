const fs = require('fs');
const path = require('path');
const lucide = require('./node_modules/lucide-react');

let missing = 0;
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g);
  for (const match of matches) {
    const icons = match[1].split(',').map(s => s.trim().replace(/\s+as\s+\w+/, '')).filter(Boolean);
    for (const icon of icons) {
      if (!lucide[icon]) {
        console.error('MISSING ICON in ' + filePath + ': ' + icon);
        missing++;
      }
    }
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.jsx')) checkFile(p);
  }
}

walk(path.join(__dirname, 'src'));
console.log('Checked all files. Total missing icons:', missing);
