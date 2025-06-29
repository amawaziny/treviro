import puppeteer from 'puppeteer';
import type { ListedSecurity } from '@/lib/types';

// Direct URL to Egyptian financial sector stocks
const TRADINGVIEW_URL = 'https://ar.tradingview.com/screener/predefined/africa_egypt_financial/';

interface StockData {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
  currency: string;
  market: string;
  securityType: 'Stock';
  logoUrl: string;
}

async function scrapeFinancialSectorStocks() {
  console.log('Starting to scrape financial sector stocks...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to false to see the browser
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    defaultViewport: {
      width: 1280,
      height: 800
    }
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    
    // Enable request interception to block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      // Block images, styles, fonts, and other unnecessary resources
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    console.log(`Navigating to ${TRADINGVIEW_URL}...`);
    await page.goto(TRADINGVIEW_URL, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Take a screenshot of the initial page
    await page.screenshot({ path: 'tradingview-initial.png' });
    console.log('Initial page screenshot saved as tradingview-initial.png');
    
    // Wait for the page to fully load
    console.log('Waiting for page to fully load...');
    await page.waitForSelector('body', { timeout: 30000 });
    
    // Wait for the table to load
    console.log('Waiting for stocks table to load...');
    await page.waitForSelector('table', { timeout: 30000 });
    
    // Scroll to load all rows
    console.log('Scrolling to load all rows...');
    await autoScroll(page);
    
    // Take a screenshot after scrolling
    await page.screenshot({ path: 'tradingview-after-scroll.png' });
    console.log('Screenshot after scrolling saved as tradingview-after-scroll.png');
    
    // Extract stock data from the table
    console.log('Extracting stock data...');
    const stocks: StockData[] = await page.evaluate(() => {
      const stocks: StockData[] = [];
      
      // Find the main table
      const table = document.querySelector('table') as HTMLTableElement;
      if (!table) {
        console.error('No table found on the page');
        return [];
      }
      
      console.log(`Found table with ${table.rows.length} rows`);
      
      // Get all rows from the table
      const rows = Array.from(table.rows);
      if (rows.length === 0) {
        console.error('No rows found in the table');
        return [];
      }
      
      // Log column headers for debugging
      const headerRow = rows[0];
      const headers = Array.from(headerRow.cells).map(cell => cell.textContent?.trim() || '');
      console.log('Table headers:', headers);
      
      // Process each data row (skip header row)
      for (let i = 1; i < rows.length; i++) {
        try {
          const row = rows[i];
          const cells = Array.from(row.cells);
          
          if (cells.length < 3) {
            console.log(`Skipping row ${i} with only ${cells.length} cells`);
            continue;
          }
          
          // Log row content for debugging
          console.log(`\nRow ${i} has ${cells.length} cells:`);
          cells.forEach((cell, idx) => {
            console.log(`  Cell ${idx} (${headers[idx] || 'no header'}): ${cell.textContent?.trim()}`);
          });
          
          // Extract symbol and name (first cell with a link)
          const symbolCell = cells[0].querySelector('a') || cells[0];
          let symbol = symbolCell.textContent?.trim() || '';
          let name = symbol;
          
          // If the cell contains both symbol and name (common format: 'SYMBOL - Name')
          if (symbol.includes(' - ')) {
            const parts = symbol.split(' - ');
            symbol = parts[0].trim();
            name = parts.slice(1).join(' - ').trim();
          }
          
          // Try to find price (look for a number in the first few cells)
          let price = 0;
          for (let j = 1; j < Math.min(4, cells.length); j++) {
            const text = cells[j].textContent?.trim() || '';
            const num = parseFloat(text.replace(/[^\d.-]/g, ''));
            if (!isNaN(num)) {
              price = num;
              break;
            }
          }
          
          // Try to find change percent (look for percentage in the last few cells)
          let changePercent = 0;
          for (let j = cells.length - 1; j >= Math.max(0, cells.length - 3); j--) {
            const text = cells[j].textContent?.trim() || '';
            if (text.includes('%')) {
              changePercent = parseFloat(text.replace(/[^\d.-]/g, '')) || 0;
              break;
            }
          }
          
          // Only add if we have valid data
          if (symbol) {
            stocks.push({
              name,
              symbol,
              price,
              changePercent,
              currency: 'EGP',
              market: 'EGX',
              securityType: 'Stock',
              logoUrl: `https://s3-symbol-logo.tradingview.com/${symbol.toLowerCase()}.svg`,
            });
            console.log(`Added stock: ${symbol} - Price: ${price} - Change: ${changePercent}%`);
          }
        } catch (error) {
          console.error(`Error processing row ${i}:`, error);
        }
      }
      
      return stocks;
    });
    
    // Log the results
    console.log('\n=== Parsed Stocks ===');
    if (stocks.length > 0) {
      console.table(stocks);
      console.log(`\nFound ${stocks.length} financial sector stocks.`);
      
      // Save results to a JSON file for inspection
      const fs = require('fs');
      const path = require('path');
      const outputPath = path.join(__dirname, 'financial_stocks.json');
      fs.writeFileSync(outputPath, JSON.stringify(stocks, null, 2));
      console.log(`Results saved to: ${outputPath}`);
      
      // Save the page HTML for debugging
      const htmlContent = await page.content();
      fs.writeFileSync('tradingview-page.html', htmlContent);
      console.log('Page HTML saved to tradingview-page.html');
      
      // Take a final screenshot
      await page.screenshot({ path: 'tradingview-final.png', fullPage: true });
      console.log('Final screenshot saved as tradingview-final.png');
    } else {
      console.log('No stocks found. The page structure might have changed or the selectors need updating.');
      
      // Take a screenshot of the entire page
      await page.screenshot({ path: 'tradingview-no-stocks.png', fullPage: true });
      console.log('Screenshot saved as tradingview-no-stocks.png');
      
      // Save the page HTML for debugging
      const htmlContent = await page.content();
      const fs = require('fs');
      fs.writeFileSync('tradingview-page.html', htmlContent);
      console.log('Page HTML saved to tradingview-page.html');
      
      // Log all tables on the page for debugging
      const tablesInfo = await page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        return tables.map((table, index) => {
          const rows = table.rows;
          const firstRowCells = rows[0] ? Array.from(rows[0].cells).map(cell => cell.textContent?.trim()) : [];
          return {
            index,
            rows: rows.length,
            columns: firstRowCells.length,
            firstRow: firstRowCells,
            html: table.outerHTML.substring(0, 500) + (table.outerHTML.length > 500 ? '...' : '')
          };
        });
      });
      
      console.log('\n=== Tables on the page ===');
      console.table(tablesInfo);
    }
    
    return stocks;
    
  } catch (error) {
    console.error('Error scraping financial sector stocks:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Helper function to auto-scroll the page
async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Start the scraping process
scrapeFinancialSectorStocks()
  .then(() => {
    console.log('\nScraping completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScraping failed:', error);
    process.exit(1);
  });
