import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import type { ListedSecurity } from '@/lib/types';

interface Sector {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
  currency: string;
  market: string;
  securityType: string;
  logoUrl: string;
}

// Configuration
const MUBASHER_URL = 'https://www.mubasher.info/markets/EGX';
const LOGIN_URL = 'https://www.mubasher.info/login?country=eg';
const USERNAME = 'javaroot86@gmail.com';
const PASSWORD = 'Test@123';
const SECTORS_FILE = path.join(__dirname, 'financial_stocks.json');
const OUTPUT_FILE = path.join(__dirname, 'all_egx_stocks.json');

// Helper function to take screenshots for debugging
async function takeScreenshot(page: Page, name: string) {
  const screenshotPath = path.join(__dirname, `${name}-${Date.now()}.png`) as `${string}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved as ${screenshotPath}`);
  return screenshotPath;
}

// Helper function to wait for navigation to complete
async function waitForNavigation(page: Page) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
  ]);
}

// Helper function to find elements across all frames
async function findElementInFrames(page: Page, selector: string, timeout = 5000): Promise<{frame: any, element: any} | null> {
  const frames = page.frames();
  
  for (const frame of frames) {
    try {
      const element = await frame.waitForSelector(selector, { visible: true, timeout });
      if (element) {
        return { frame, element };
      }
    } catch (e) {
      // Ignore and try next frame
    }
  }
  return null;
}

async function login(page: Page): Promise<boolean> {
  try {
    console.log('Navigating to login page...');
    
    // Set viewport to a common desktop size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Disable timeouts for debugging
    page.setDefaultNavigationTimeout(0);
    page.setDefaultTimeout(60000);
    
    // Set user agent to a common browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Enable request interception to handle dynamic loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      request.continue();
    });
    
    // Navigate with networkidle0 to ensure all resources are loaded
    console.log(`Navigating to: ${LOGIN_URL}`);
    await page.goto(LOGIN_URL, { 
      waitUntil: 'networkidle0',
      timeout: 120000 // 2 minutes timeout
    });
    
    // Wait a bit for any redirects
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take an initial screenshot
    await takeScreenshot(page, 'mubasher-initial-page');
    
    // Wait for the login form to be visible
    console.log('Waiting for login form...');
    
    // Wait for any iframes to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get all frames
    const frames = page.frames();
    console.log(`Found ${frames.length} frames on the page`);
    
    // Log frame URLs for debugging
    for (let i = 0; i < frames.length; i++) {
      try {
        const frameUrl = frames[i].url();
        console.log(`Frame ${i}: ${frameUrl}`);
      } catch (e) {
        console.log(`Frame ${i}: [cannot access URL]`);
      }
    }
    
    // Try to find the login frame by various methods
    let loginFrame = null;
    
    // Method 1: Look for frame with login form
    for (const frame of frames) {
      try {
        const hasEmailField = await frame.$('input[type="email"], input[formcontrolname="email"], input[name*="email"]') !== null;
        if (hasEmailField) {
          loginFrame = frame;
          console.log('Found login frame by email field');
          break;
        }
      } catch (e) {
        // Ignore errors when accessing frames
      }
    }
    
    // Method 2: Look for frame with login in URL
    if (!loginFrame) {
      loginFrame = frames.find(frame => {
        try {
          const url = frame.url().toLowerCase();
          return url.includes('login') || url.includes('auth') || url.includes('signin');
        } catch (e) {
          return false;
        }
      });
      if (loginFrame) console.log('Found login frame by URL pattern');
    }
    
    // Method 3: Try to find any frame with form elements
    if (!loginFrame) {
      for (const frame of frames) {
        try {
          const hasForm = await frame.$('form, input, button') !== null;
          if (hasForm) {
            loginFrame = frame;
            console.log('Found potential login frame by form elements');
            break;
          }
        } catch (e) {
          // Ignore errors when accessing frames
        }
      }
    }
    
    if (!loginFrame) {
      console.error('Could not find login frame. Available frames:');
      await takeScreenshot(page, 'mubasher-no-login-frame');
      
      // Dump page content for debugging
      const pageContent = await page.content();
      const contentPath = path.join(__dirname, 'mubasher-page-content.html');
      await fs.promises.writeFile(contentPath, pageContent);
      console.log(`Page content saved to: ${contentPath}`);
      
      return false;
    }
    
    console.log(`Found login frame: ${loginFrame.url()}`);
    
    // Check if we can find input fields in the login frame
    try {
      await loginFrame.waitForSelector('input, form', { visible: true, timeout: 10000 });
      console.log('Found input field or form in login frame');
      
      // Log available form elements for debugging
      const formElements = await loginFrame.$$eval('input, button, form', elements => 
        elements.map(el => ({
          tag: el.tagName,
          id: el.id,
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          class: el.className,
          placeholder: el.getAttribute('placeholder')
        }))
      );
      console.log('Form elements found:', formElements);
      
    } catch (e) {
      console.error('Could not find any input fields or forms in the login frame');
      await takeScreenshot(page, 'mubasher-no-input-fields');
      
      // Try to get the frame's HTML for debugging
      try {
        const frameHtml = await loginFrame.content();
        const framePath = path.join(__dirname, 'login-frame-content.html');
        await fs.promises.writeFile(framePath, frameHtml);
        console.log(`Login frame content saved to: ${framePath}`);
      } catch (e) {
        console.error('Could not save frame content:', e);
      }
      
      return false;
    }
    
    // Try to find and fill email field in the login frame
    try {
      console.log('Looking for email field in login frame...');
      await loginFrame.waitForSelector('input[formcontrolname="email"]', { 
        visible: true, 
        timeout: 10000 
      });
      
      // Type the email
      await loginFrame.type('input[formcontrolname="email"]', USERNAME, { 
        delay: 50 
      });
      console.log('Entered email address');
      
      // Wait a bit before typing password
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now find and fill password field
      await loginFrame.waitForSelector('input[formcontrolname="password"]', {
        visible: true,
        timeout: 5000
      });
      
      // Type the password
      await loginFrame.type('input[formcontrolname="password"]', PASSWORD, {
        delay: 50
      });
      console.log('Entered password');
      
      // Wait a bit before submitting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if we're ready to submit
      const isFormReady = await loginFrame.evaluate(() => {
        const emailInput = document.querySelector('input[formcontrolname="email"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[formcontrolname="password"]') as HTMLInputElement;
        return emailInput?.value && passwordInput?.value;
      });
      
      if (!isFormReady) {
        console.error('Form is not ready for submission');
        await takeScreenshot(page, 'mubasher-form-not-ready');
        return false;
      }

      // Take a screenshot before submitting
      await takeScreenshot(page, 'mubasher-before-login');
      
      // Submit the form by pressing Enter on the password field
      console.log('Submitting login form...');
      await page.keyboard.press('Enter');
      
      // Wait for navigation or login to complete
      console.log('Waiting for login to complete...');
      try {
        await Promise.race([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
          page.waitForSelector('body.logged-in, [data-testid="user-menu"], .user-avatar', { timeout: 30000 })
        ]);
        
        // Check if login was successful
        const isLoggedIn = await page.evaluate(() => {
          return document.body.classList.contains('logged-in') || 
                 document.querySelector('[data-testid="user-menu"], .user-avatar') !== null;
        });
        
        if (isLoggedIn) {
          console.log('Successfully logged in!');
          await takeScreenshot(page, 'mubasher-login-success');
          return true;
        } else {
          console.log('Login status unclear, checking for error messages...');
          // Check for error messages
          const errorMessage = await page.evaluate(() => {
            const errorElement = document.querySelector('.alert-danger, .error-message, .login-error, .error, [role="alert"]');
            return errorElement ? errorElement.textContent : null;
          });
          
          if (errorMessage) {
            console.error('Login error:', errorMessage.trim());
          }
          
          await takeScreenshot(page, 'mubasher-login-unknown-status');
          return false;
        }
      } catch (e: any) {
        console.error('Error during login verification:', e?.message || 'Unknown error');
        await takeScreenshot(page, 'mubasher-login-verification-error');
        return false;
      }
    } catch (error) {
      console.error('Error during login process:', error);
      if (page) {
        await takeScreenshot(page, 'mubasher-login-process-error');
      }
      return false;
    }
  } catch (error) {
    console.error('Unexpected error in login function:', error);
    return false;
  }
}

async function scrapeSectorStocks(page: Page, sector: Sector): Promise<ListedSecurity[]> {
  try {
    console.log(`\nProcessing sector: ${sector.name}`);
    
    // Navigate to the sector page
    const sectorUrl = `${MUBASHER_URL}/sector/${encodeURIComponent(sector.symbol)}`;
    console.log(`Navigating to sector page: ${sectorUrl}`);
    
    await page.goto(sectorUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    // Take a screenshot for debugging
    await takeScreenshot(page, `sector-${sector.symbol}`);
    
    // Wait for the stocks table to load
    console.log('Waiting for stocks table to load...');
    await page.waitForSelector('.market-table', { timeout: 30000 });
    
    // Extract the stocks data
    console.log('Extracting stocks data...');
    const stocks = await page.evaluate((sectorData: Sector): ListedSecurity[] => {
      const stocks: ListedSecurity[] = [];
      const table = document.querySelector('.market-table');
      if (!table) {
        console.error('Stocks table not found for sector:', sectorData.name);
        return [];
      }

      // Get table headers to map columns to data
      const headerRow = table.querySelector('thead tr');
      const headers: string[] = [];
      
      if (headerRow) {
        headerRow.querySelectorAll('th').forEach(th => {
          headers.push(th.textContent?.trim() || '');
        });
      } else {
        console.warn('No header row found in the table');
      }

      // Get all rows in the table body
      const rows = table.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return; // Skip rows without enough data
        
        // Get symbol and name from the first cell
        const symbolCell = cells[0];
        const symbol = symbolCell.textContent?.trim() || '';
        const name = symbol; // Mubasher typically shows symbol as the main identifier
        
        // Parse price and change percent from the row cells
        let price = 0;
        let changePercent = 0;
        let detailLink = '';
        
        // Try to parse numeric values from cells
        for (let i = 1; i < cells.length; i++) {
          const cellText = cells[i].textContent?.trim() || '';
          // Determine the type of data based on header or cell content
          const headerText = headers[i] || '';
          if (headerText.includes('Price') || headerText.includes('السعر')) {
            price = parseFloat(cellText.replace(/[^0-9.-]+/g, '')) || 0;
          } else if (headerText.includes('%') || headerText.includes('٪')) {
            changePercent = parseFloat(cellText.replace(/[^0-9.-]+/g, '')) || 0;
          }
        }
        
        // Get the link to the stock's detail page if available
        const linkElement = symbolCell.querySelector('a');
        if (linkElement) {
          detailLink = linkElement.getAttribute('href') || '';
        }

        // Map to ListedSecurity type with sector information
        const security: ListedSecurity & { sector?: string } = {
          id: symbol.toLowerCase(),
          symbol,
          name,
          price: price || 0,
          changePercent: changePercent || 0,
          currency: 'EGP',
          market: 'EGX',
          securityType: 'Stock',
          logoUrl: detailLink ? `https://www.mubasher.info${detailLink.replace('/stock/', '/logos/')}.png` : '',
          description: `${name} - ${sectorData.name} sector`,
          fundType: 'Equity',
          sector: sectorData.name
        };
        stocks.push(security);
      });

      return stocks;
    }, sector);
    
    return stocks || [];
  } catch (error) {
    console.error(`Error scraping stocks for sector ${sector.name}:`, error);
    await takeScreenshot(page, `error-${sector.symbol}`);
    return [];
  }
}

async function loadSectors(): Promise<Sector[]> {
  try {
    const data = await fs.promises.readFile(SECTORS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading sectors file:', error);
    return [];
  }
}

async function main() {
  console.log('Starting Mubasher EGX Market Scraper...');
  
  // Load sectors from the JSON file
  const sectors = await loadSectors();
  if (sectors.length === 0) {
    console.error('No sectors found. Please check the financial_stocks.json file.');
    return;
  }
  
  console.log(`Loaded ${sectors.length} sectors to process`);
  
  // Browser launch options
  const launchOptions: any = {
    headless: false, // Set to true for production
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--window-size=1400,900',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-extensions',
      '--disable-hang-monitor',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-pings',
      '--password-store=basic',
      '--use-mock-keychain'
    ],
    defaultViewport: {
      width: 1400,
      height: 900,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: false
    }
  };
  
  // Add ignoreHTTPSErrors if needed
  launchOptions.ignoreHTTPSErrors = true;
  
  // Launch the browser
  const browser = await puppeteer.launch(launchOptions);
  
  const page = await browser.newPage();
  
  try {
    // Set a modern user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    
    // Additional headers to appear more like a regular browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Referer': 'https://www.google.com/',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    });
    
    // Set viewport to a common desktop size
    await page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: false
    });
    
    // Disable WebDriver flag
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      // Overwrite the languages property to use a valid language
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      // Overwrite the plugins property to use a standard plugins array
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });
    
    // Login to Mubasher
    const isLoggedIn = await login(page);
    if (!isLoggedIn) {
      throw new Error('Failed to login to Mubasher');
    }
    
    // Array to store all stocks from all sectors
    const allStocks: ListedSecurity[] = [];
    
    // Process each sector one by one
    for (const sector of sectors) {
      try {
        const sectorStocks = await scrapeSectorStocks(page, sector);
        console.log(`Found ${sectorStocks.length} stocks in ${sector.name}`);
        allStocks.push(...sectorStocks);
        
        // Add a small delay between sectors to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error processing sector ${sector.name}:`, error);
        continue; // Continue with next sector if one fails
      }
    }
    
    // Save all stocks to a JSON file
    await fs.promises.writeFile(
      OUTPUT_FILE, 
      JSON.stringify(allStocks, null, 2)
    );
    
    console.log(`\nSuccessfully scraped ${allStocks.length} stocks from ${sectors.length} sectors`);
    console.log(`Results saved to: ${OUTPUT_FILE}`);
    
    // Close the browser
    if (browser) {
      await browser.close();
    }
  } catch (error) {
    console.error('Error running the scraper:', error);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

// Run the scraper
main().catch(console.error);
