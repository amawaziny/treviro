const fs = require('fs');
const path = require('path');

// File paths
const htmlFile = '/home/amawaziny/Downloads/egx/stocks.html';
const outputFile = '/home/amawaziny/Projects/other/treviro/data/egx-isins.json';

// Read the HTML file
const htmlContent = fs.readFileSync(htmlFile, 'utf8');

// Extract ISINs using regex
const isinRegex = /EGS[0-9A-Z]{9}/g;
const isins = [...new Set(htmlContent.match(isinRegex) || [])];

// Sort the ISINs
isins.sort();

// Save to file
fs.writeFileSync(outputFile, JSON.stringify(isins, null, 2));

console.log(`Found ${isins.length} unique ISINs`);
console.log(`Saved to: ${outputFile}`);

// Display first 10 ISINs as a sample
console.log('\nSample ISINs:');
console.log(isins.slice(0, 10).join('\n'));
