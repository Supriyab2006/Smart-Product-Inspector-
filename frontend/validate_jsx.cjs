const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Find all components used in JSX like <SomeName or <SomeName.Sub
  const jsxTags = new Set();
  const tagMatches = content.matchAll(/<([A-Z][a-zA-Z0-9]+)/g);
  for (const m of tagMatches) {
    jsxTags.add(m[1]);
  }

  // Find all imports in file
  const imported = new Set();
  const importMatches = content.matchAll(/import\s+(?:([A-Z][a-zA-Z0-9]+)|\{([^}]+)\})/g);
  for (const m of importMatches) {
    if (m[1]) imported.add(m[1]);
    if (m[2]) {
      m[2].split(',').forEach(s => {
        const name = s.trim().split(/\s+as\s+/).pop().trim();
        if (name) imported.add(name);
      });
    }
  }

  // Check locally defined components / functions
  const defMatches = content.matchAll(/(?:function|class|const)\s+([A-Z][a-zA-Z0-9]+)/g);
  for (const m of defMatches) {
    imported.add(m[1]);
  }

  for (const tag of jsxTags) {
    if (!imported.has(tag)) {
      console.error(`ERROR: ${filePath} uses <${tag}> but it is NOT imported or defined!`);
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
console.log('JSX Tag validation finished.');
