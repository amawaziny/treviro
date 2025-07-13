const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Configuration
const CONCURRENT_REQUESTS = 1; // Reduced to 1 to avoid detection
const DELAY_BETWEEN_REQUESTS = 5000; // Increased delay
const OUTPUT_FILE = '/home/amawaziny/Projects/other/treviro/data/egx-companies-detailed.json';
const INPUT_FILE = '/home/amawaziny/Projects/other/treviro/data/egx-stocks-bilingual.json';

// Load the existing data
let stocks = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

// Function to simulate human-like delays
const randomDelay = (min = 1000, max = 3000) => 
  new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

// Function to extract company details
async function extractCompanyDetails(page) {
  return await page.evaluate(() => {
    const getText = (selector) => {
      const element = document.querySelector(selector);
      return element ? element.textContent.trim() : null;
    };

    // Extract basic information
    return {
      name: getText('.company-name'),
      sector: getText('.sector'),
      listingDate: getText('.listing-date'),
      website: document.querySelector('a[href^="http"]')?.href || null,
      // Add more selectors as needed
    };
  }).catch(err => {
    console.error('Error extracting details:', err);
    return null;
  });
}

// Main scraping function
async function scrapeCompanies() {
  // Start with a test run of 3 companies
  const testStocks = stocks.slice(0, 3);
  const results = [];

  const browser = await puppeteer.launch({
    headless: false, // Set to true in production
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ],
    defaultViewport: null
  });

  try {
    for (const stock of testStocks) {
      const page = await browser.newPage();
      
      try {
        // Set realistic viewport
        await page.setViewport({
          width: 1366,
          height: 768,
          deviceScaleFactor: 1,
          hasTouch: false,
          isLandscape: false,
          isMobile: false
        });

        // Set user agent and headers
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setExtraHTTPHeaders({
          'accept-language': 'en-US,en;q=0.9',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'accept-encoding': 'gzip, deflate, br',
          'upgrade-insecure-requests': '1'
        });

        console.log(`Navigating to company: ${stock.companyName} (${stock.isin})`);
        
        // Navigate to the URL with retry logic
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
            await page.goto(`https://www.egx.com.eg/en/CompanyDetails.aspx?ISIN=${stock.isin}`, {
              waitUntil: 'domcontentloaded',
              timeout: 30000
            });
            
            // Wait for the content to load
            await page.waitForSelector('body', { timeout: 10000 });
            
            // Save screenshot for debugging
            await page.screenshot({ path: `debug-${stock.isin}.png` });
            
            // Save page content for inspection
            const content = await page.content();
            fs.writeFileSync(`page-${stock.isin}.html`, content);
            
            // Try to extract details
            const details = await extractCompanyDetails(page);
            
            if (details) {
              results.push({
                ...stock,
                ...details
              });
              console.log(`Successfully scraped: ${stock.companyName}`);
              success = true;
            } else {
              console.log(`No details found for: ${stock.companyName}`);
              retries--;
              await randomDelay(2000, 5000);
            }
          } catch (error) {
            console.error(`Error (${retries} retries left) for ${stock.isin}:`, error.message);
            retries--;
            await randomDelay(3000, 7000);
          }
        }
        
        if (!success) {
          console.error(`Failed to scrape ${stock.companyName} after 3 attempts`);
          results.push({
            ...stock,
            error: 'Failed to scrape after 3 attempts'
          });
        }
        
        // Save progress after each company
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
        
        // Random delay between requests
        const delay = Math.floor(Math.random() * 5000) + 3000;
        console.log(`Waiting ${delay}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error(`Error processing ${stock.isin}:`, error);
      } finally {
        await page.close();
      }
    }
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
    console.log('\nScraping completed. Results saved to:', OUTPUT_FILE);
  }
}

// Install required plugins and start scraping
(async () => {
  try {
    // Install stealth plugin if not already installed
    await puppeteer.use(StealthPlugin());
    
    // Start the scraping process
    await scrapeCompanies();
  } catch (error) {
    console.error('Initialization error:', error);
  }
})();
