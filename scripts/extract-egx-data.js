const fs = require('fs');
const cheerio = require('cheerio');

// Read the HTML file
const html = fs.readFileSync('/home/amawaziny/Downloads/egx/stocks.html', 'utf8');
const $ = cheerio.load(html);

// Find all tables
const tables = $('table').toArray();
const stocks = [];
let currentStock = null;

// Process each table
tables.forEach((table, index) => {
  const $table = $(table);
  const rows = $('tr', $table);
  
  // First row of a stock entry (contains company name and basic info)
  if (rows.length === 1) {
    const firstRow = $('td', rows[0]);
    if (firstRow.length > 1) {
      const companyName = $(firstRow[0]).text().trim();
      if (companyName) {
        currentStock = { companyName };
      }
    }
  } 
  // Second row of a stock entry (contains more details)
  else if (rows.length === 2 && currentStock) {
    const cells = $('td', rows[1]);
    if (cells.length >= 4) {
      // Extract ISIN code and other details
      const isin = $(cells[0]).text().trim();
      const symbol = $(cells[1]).text().trim();
      const price = $(cells[2]).text().trim();
      const change = $(cells[3]).text().trim();
      
      // Add to current stock
      currentStock.isin = isin;
      currentStock.symbol = symbol;
      currentStock.price = price;
      currentStock.change = change;
      
      // Add to stocks array and reset current stock
      stocks.push(currentStock);
      currentStock = null;
    }
  }
});

console.log(`Found ${stocks.length} stocks`);
if (stocks.length > 0) {
  console.log('Sample stock data:', JSON.stringify(stocks[0], null, 2));
}

// Save to a JSON file
fs.writeFileSync(
  '/home/amawaziny/Projects/other/treviro/data/egx-stocks.json',
  JSON.stringify(stocks, null, 2),
  'utf8'
);

console.log('Stock data saved to data/egx-stocks.json');
