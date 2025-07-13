const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

// File paths
const ISINS_JSON = path.join(__dirname, '../data/egx-isins.json');
const DETAILED_JSON = path.join(__dirname, '../data/egx-companies-detailed.json');

// Load existing data
let detailedCompanies = [];
if (fs.existsSync(DETAILED_JSON)) {
  detailedCompanies = JSON.parse(fs.readFileSync(DETAILED_JSON, 'utf-8'));
}

// Load ISINs
const isins = JSON.parse(fs.readFileSync(ISINS_JSON, 'utf-8'));

// Create a map of existing companies by ISIN for faster lookup
const companiesByIsin = new Map(detailedCompanies.map(company => [company.isin, company]));

// Function to prompt user for confirmation
function prompt(question) {
  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

// Function to get company details
async function getCompanyDetails(isin, companyName, sector, companyNameAr, sectorAr) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    const url = `https://www.egx.com.eg/en/CompanyDetails.aspx?ISIN=${isin}`;
    console.log(`\n=== Processing: ${companyName || companyNameAr} (${isin}) ===`);
    console.log(`URL: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for the page to load
      console.log('Waiting for CAPTCHA to be solved...');
      
      // Wait for navigation after CAPTCHA is solved
      await page.waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: 300000 // 5 minutes timeout
      });
      
      console.log('CAPTCHA solved! Extracting data...');
      
      // Take a screenshot for reference
      // await page.screenshot({ path: `debug-${isin}.png` });
      
      // Extract data using the same approach as manual-captcha-solver.js
      const data = await page.evaluate((isin) => {
        // Function to get value by label from the 4-column table
        const getValueByLabel = (label) => {
          const rows = document.querySelectorAll('tr');
          
          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td, th'));
            
            // Check first column
            if (cells[0] && cells[0].textContent.trim() === label && cells[1]) {
              const valueCell = cells[1];
              const span = valueCell.querySelector('span');
              return span ? span.textContent.trim() : valueCell.textContent.trim();
            }
            
            // Check third column
            if (cells[2] && cells[2].textContent.trim() === label && cells[3]) {
              const valueCell = cells[3];
              const span = valueCell.querySelector('span');
              return span ? span.textContent.trim() : valueCell.textContent.trim();
            }
          }
          return null;
        };
        
        try {
          // Extract all data
          const companyName = document.querySelector('span[id*="Label1"]')?.textContent.trim() || 'Unknown';
          const sector = getValueByLabel('Sector');
          
          const result = {
            isin: isin,
            symbol: getValueByLabel('Reuters Code'),
            companyName: companyName,
            sector: sector, // This will override the existing sector
            companyNameAr: '',  // Will be filled from bilingual data
            sectorAr: '',       // Will be filled from bilingual data
            details: {
              // Basic Data
              parValue: getValueByLabel('Par Value'),
              currency: getValueByLabel('Currency'),
              listingDate: getValueByLabel('Listing Date'),
              securityType: getValueByLabel('Security Type'),
              listedShares: getValueByLabel('Listed shares'),
              
              // Additional Information
              tradedVolume: getValueByLabel('Traded Volume'),
              couponPaymentDate: getValueByLabel('Coupon Payment Date'),
              tradedValue: getValueByLabel('Traded Value'),
              priceEarningRatio: getValueByLabel('Price Earning Ratio'),
              dividendYield: getValueByLabel('Dividend Yield'),
              cashDividends: getValueByLabel('Cash Dividends L.E./$'),
              couponNo: getValueByLabel('Coupon No'),
              closingPrice: getValueByLabel('Closing Price'),
              marketCap: getValueByLabel('Market Cap.')
            },
            lastUpdated: new Date().toISOString()
          };
          
          return result;
        } catch (error) {
          console.error('Error during data extraction:', error);
          return {
            isin: isin,
            error: error.message,
            pageContent: document.documentElement.outerHTML.substring(0, 1000) + '...'
          };
        }
      }, isin);
      
      // Merge with bilingual data
      data.companyName = companyName || data.companyName;
      data.sector = data.sector || sector;
      data.companyNameAr = companyNameAr || '';
      data.sectorAr = sectorAr || '';
      
      // Show the extracted data
      console.log('\n=== Extracted Data ===');
      console.log(JSON.stringify(data, null, 2));
      
      // Ask user if data is correct
      const isCorrect = await prompt('\nIs this data correct? (y/n): ');
      
      if (!isCorrect) {
        console.log('Please update the data and press Enter to continue...');
        await new Promise(resolve => readline.once('line', resolve));
        
        // Get the updated data from the page
        const updatedData = await page.evaluate(() => {
          const data = {};
          document.querySelectorAll('table tr').forEach(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim();
              const value = cells[1].textContent.trim();
              if (label && value) {
                data[label] = value;
              }
            }
          });
          return data;
        });
        
        console.log('\n=== Page Data ===');
        console.log(updatedData);
        
        // Let user update the data
        console.log('\nPlease enter the correct data:');
        data.details = {
          parValue: await prompt('Par Value: '),
          currency: await prompt('Currency: '),
          listingDate: await prompt('Listing Date: '),
          securityType: await prompt('Security Type: '),
          listedShares: await prompt('Listed Shares: '),
          tradedVolume: await prompt('Traded Volume: '),
          couponPaymentDate: await prompt('Coupon Payment Date: '),
          tradedValue: await prompt('Traded Value: '),
          priceEarningRatio: await prompt('P/E Ratio: '),
          dividendYield: await prompt('Dividend Yield: '),
          cashDividends: await prompt('Cash Dividends: '),
          couponNo: await prompt('Coupon No: '),
          closingPrice: await prompt('Closing Price: '),
          marketCap: await prompt('Market Cap: ')
        };
      }
      
      return data;
      
    } catch (error) {
      console.error(`Error processing ${isin}:`, error.message);
      return {
        isin,
        companyName: companyName || '',
        sector: sector || '',
        companyNameAr: companyNameAr || '',
        sectorAr: sectorAr || '',
        error: error.message,
        lastUpdated: new Date().toISOString()
      };
    }
    
  } finally {
    await browser.close();
  }
}

// Process companies one by one
async function processCompanies() {
  console.log(`Found ${isins.length} companies in ISINs list.\n`);

  for (const isin of isins) {
    const existingCompany = companiesByIsin.get(isin);
    
    // Skip if already processed and not forced
    if (existingCompany && !process.env.FORCE_UPDATE) {
      console.log(`\n=== Skipping (already processed): ${isin} ===`);
      continue;
    }

    console.log(`\n=== Processing: ${isin} ===`);
    
    try {
      // Get company details with empty values for bilingual data
      const companyData = await getCompanyDetails(
        isin,
        '',  // companyName will be filled from the page
        '',  // sector will be filled from the page
        '',  // companyNameAr will be empty
        ''   // sectorAr will be empty
      );

      // Show the extracted data
      console.log('\n=== Extracted Data ===');
      console.log(JSON.stringify(companyData, null, 2));

      // Ask for confirmation
      const isCorrect = await prompt('\nIs this data correct? (y/n): ');
      
      if (isCorrect) {
        // Update or add the company data
        if (existingCompany) {
          Object.assign(existingCompany, companyData);
        } else {
          companiesByIsin.set(isin, companyData);
        }
        
        // Save the updated data
        fs.writeFileSync(
          DETAILED_JSON,
          JSON.stringify(Array.from(companiesByIsin.values()), null, 2),
          'utf-8'
        );
        
        console.log('Data saved successfully!');
      } else {
        console.log('Data not saved. Please update the data and press Enter to continue...');
        await new Promise(resolve => readline.once('line', resolve));
        
        // Save the data as is if the user manually updated it
        if (existingCompany) {
          Object.assign(existingCompany, companyData);
        } else {
          companiesByIsin.set(isin, companyData);
        }
        
        fs.writeFileSync(
          DETAILED_JSON,
          JSON.stringify(Array.from(companiesByIsin.values()), null, 2),
          'utf-8'
        );
        
        console.log('Data saved with manual updates.');
      }
    } catch (error) {
      console.error(`Error processing ${isin}:`, error);
      
      // Save error information
      const errorData = {
        isin: isin,
        error: error.message,
        lastUpdated: new Date().toISOString()
      };
      
      if (existingCompany) {
        Object.assign(existingCompany, errorData);
      } else {
        companiesByIsin.set(isin, errorData);
      }
      
      fs.writeFileSync(
        DETAILED_JSON,
        JSON.stringify(Array.from(companiesByIsin.values()), null, 2),
        'utf-8'
      );
      
      console.log('Error details saved.');
    }
    
    // Ask if user wants to continue
    const shouldContinue = await prompt('\nContinue to next company? (y/n): ');
    if (!shouldContinue) {
      console.log('\nStopped by user.');
      break;
    }
  }
  
  return Array.from(companiesByIsin.values());
}

// Run the script
(async () => {
  try {
    console.log('Starting step-by-step company data extraction...');
    console.log(`Found ${isins.length} companies in bilingual data.`);
    
    const results = await processCompanies();
    
    // Final save
    fs.writeFileSync(DETAILED_JSON, JSON.stringify(results, null, 2));
    console.log(`\n=== Completed! Processed ${results.length} companies. ===`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    readline.close();
    process.exit(0);
  }
})();
