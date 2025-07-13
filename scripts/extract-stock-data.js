const fs = require('fs');
const cheerio = require('cheerio');

// Read the HTML file
const html = fs.readFileSync('/home/amawaziny/Downloads/egx/stocks.html', 'utf8');
const $ = cheerio.load(html);

// Extract all text content and look for patterns
const text = $('body').text();
const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

// Look for stock patterns
const stocks = [];
let currentSector = 'Unknown Sector';
const isinPattern = /(EGS[0-9A-Z]{7}\d)/g;

// Common sectors in EGX
const sectors = [
  'Banks', 'Basic Resources', 'Construction & Materials',
  'Financial Services', 'Food & Beverage', 'Health Care',
  'Industrial Goods', 'Insurance', 'Media', 'Oil & Gas',
  'Personal & Household Goods', 'Real Estate', 'Retail',
  'Technology', 'Telecommunications', 'Travel & Leisure', 'Utilities'
];

// Process each line
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if line contains a sector name
  const sectorMatch = sectors.find(sector => line.includes(sector));
  if (sectorMatch) {
    currentSector = sectorMatch;
    continue;
  }
  
  // Check if line contains an ISIN
  const isinMatch = line.match(isinPattern);
  if (isinMatch) {
    const isin = isinMatch[0];
    // Look for company name in previous lines
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const prevLine = lines[j];
      // Skip lines that are too short or contain common non-company text
      if (prevLine.length > 3 && 
          !prevLine.includes('EGX') && 
          !prevLine.includes('Stock') &&
          !prevLine.includes('Market') &&
          !prevLine.includes('Price') &&
          !sectors.some(s => prevLine.includes(s))) {
        
        stocks.push({
          isin,
          companyName: prevLine,
          sector: currentSector
        });
        break;
      }
    }
  }
}

console.log(`Extracted ${stocks.length} stocks with sector information`);
if (stocks.length > 0) {
  console.log('Sample stock data with sector:', JSON.stringify(stocks[0], null, 2));
}

// Save to a JSON file
fs.writeFileSync(
  '/home/amawaziny/Projects/other/treviro/data/egx-stocks-extracted.json',
  JSON.stringify(stocks, null, 2),
  'utf8'
);

console.log('Stock data saved to data/egx-stocks-extracted.json');
