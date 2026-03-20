const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(__dirname);
let total = 0;
let failed = [];

for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    try {
        parser.parse(code, {
            sourceType: 'module',
            plugins: [
                'typescript',
                'jsx',
                'classProperties',
                'decorators-legacy'
            ]
        });
        total++;
    } catch (e) {
        console.error(`Error parsing ${file}: ${e.message}`);
        failed.push(file);
    }
}

console.log(`Parsed ${total} files. Failed: ${failed.length}`);
