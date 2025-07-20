const fs = require('fs');
const path = require('path');

// File paths
const DETAILS_DIR = '/home/amawaziny/Downloads/egx/details';
const DETAILED_JSON = path.join(__dirname, '../data/egx-companies-detailed.json');

// Function to read file with error handling
function readFileSafe(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
        return null;
    }
}

// Load existing data
let detailedCompanies = [];
if (fs.existsSync(DETAILED_JSON)) {
  detailedCompanies = JSON.parse(fs.readFileSync(DETAILED_JSON, 'utf-8'));
}

// Create a map of existing companies by ISIN for faster lookup
const companiesByIsin = new Map(detailedCompanies.map(company => [company.isin, company]));

// Helper function to extract text between HTML tags
function extractText(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  if (start === -1) return '';
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return '';
  return html.substring(start + startMarker.length, end).trim();
}

// Function to get value by label from HTML content
function getValueByLabel(html, label) {
  // Special handling for Market Cap - look for the specific table row with id containing 'MC_TR'
  if (label === 'Market Cap.') {
    const marketCapMatch = html.match(/<tr[^>]*id=["'][^"']*MC_TR[^"']*["'][^>]*>\s*<td[^>]*>\s*<strong>Market Cap\.?<\/strong>\s*<\/td>\s*<td[^>]*colspan=["']3["'][^>]*>\s*<span[^>]*id=["'][^"']*_Label17["'][^>]*>\s*([^<]+)\s*<\/span>/i);
    if (marketCapMatch) {
      return marketCapMatch[1].trim();
    }
    
    // Fallback to simpler pattern if the first one doesn't match
    const fallbackMatch = html.match(/<strong>Market Cap\.?<\/strong>\s*<\/td>\s*<td[^>]*>\s*<span[^>]*>\s*([^<]+)\s*<\/span>/i);
    if (fallbackMatch) {
      return fallbackMatch[1].trim();
    }
  }
  
  // Handle Arabic labels
  const arabicLabels = {
    'companyNameAr': { id: 'ctl00_C_CD_Label1' },
    'currencyAr': { id: 'ctl00_C_CD_Label5' },
    'securityTypeAr': { id: 'ctl00_C_CD_Label7' }
  };
  
  if (arabicLabels[label]) {
    const regex = new RegExp(`<span[^>]*id=["']${arabicLabels[label].id}["'][^>]*>([^<]+)<\/span>`);
    const match = html.match(regex);
    return match ? match[1].trim() : null;
  }
  
  // Create a case-insensitive regex to find the label
  const regex = new RegExp(`<strong>${label.replace('.', '\\.')}\\s*<\\/strong>`, 'i');
  const match = html.match(regex);
  
  if (!match) return null;
  
  // Find the parent table cell
  const labelCellStart = match.index;
  const rowStart = html.lastIndexOf('<tr', labelCellStart);
  if (rowStart === -1) return null;
  
  // Find the next cell in the same row
  const valueCellStart = html.indexOf('</td>', labelCellStart);
  if (valueCellStart === -1) return null;
  
  const nextCell = html.indexOf('<td', valueCellStart);
  if (nextCell === -1) return null;
  
  const cellEnd = html.indexOf('</td>', nextCell);
  if (cellEnd === -1) return null;
  
  // Extract cell content
  let cellContent = html.substring(html.indexOf('>', nextCell) + 1, cellEnd);
  
  // Clean up the content - remove HTML tags and extra whitespace
  cellContent = cellContent
    .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
    .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
    .trim();
    
  return cellContent || null;
}

// Function to parse HTML file and extract company details
function parseCompanyDetails(filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf-8');
    
    // Extract ISIN from filename (format: EGS12345C012.html or EGS12345C012-ar.html)
    // Clean up by removing any non-alphanumeric characters and trimming
    let isin = path.basename(filePath)
      .replace(/-ar\.html$|\.html$/g, '')  // Remove file extensions
      .replace(/[^A-Z0-9]/g, '')           // Remove any remaining non-alphanumeric characters
      .trim();
    
    // Special handling for known problematic ISINs
    if (isin.startsWith('EGS675S1C011')) {
      isin = 'EGS675S1C011';
    }
    const isArabic = filePath.endsWith('-ar.html');
    
    let companyData = companiesByIsin.get(isin) || {
      isin: isin,
      symbol: '',
      companyName: '',
      sector: '',
      companyNameAr: '',
      sectorAr: '',
      details: {},
      lastUpdated: new Date().toISOString()
    };

    if (isArabic) {
      // Update Arabic fields - try multiple patterns to extract company name
      let companyNameAr = '';
      
      // Try pattern 1: Look for span with id containing 'Label1'
      let nameMatch = html.match(/<span[^>]*id=["'][^"']*Label1[^"']*["'][^>]*>([^<]*)<\/span>/i);
      
      // Try pattern 2: Look for the first h2 or h3 tag if first pattern fails
      if (!nameMatch || !nameMatch[1].trim()) {
        nameMatch = html.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i);
      }
      
      // Try pattern 3: Look for any span with class containing 'company' or 'name'
      if (!nameMatch || !nameMatch[1].trim()) {
        nameMatch = html.match(/<span[^>]*class=["'][^"']*(company|name)[^"']*["'][^>]*>([^<]*)<\/span>/i);
        if (nameMatch && nameMatch[2]) {
          nameMatch[1] = nameMatch[2]; // Use the second capture group
        }
      }
      
      // If still no match, try to extract from the title or meta tags
      if (!nameMatch || !nameMatch[1].trim()) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          // Clean up the title (remove extra spaces, newlines, etc.)
          nameMatch = [null, titleMatch[1].replace(/\s+/g, ' ').trim()];
        }
      }
      
      companyData.companyNameAr = (nameMatch && nameMatch[1] ? nameMatch[1].trim() : companyData.companyNameAr || '');
      companyData.sectorAr = getValueByLabel(html, 'القطاع') || companyData.sectorAr;
      // Move currencyAr and securityTypeAr to details object and remove from root
      if (companyData.details) {
        companyData.details.currencyAr = getValueByLabel(html, 'currencyAr') || (companyData.details.currencyAr || '');
        companyData.details.securityTypeAr = getValueByLabel(html, 'securityTypeAr') || (companyData.details.securityTypeAr || '');
        
        // Remove the fields from root if they exist (for backward compatibility)
        if ('currencyAr' in companyData) delete companyData.currencyAr;
        if ('securityTypeAr' in companyData) delete companyData.securityTypeAr;
      }
    } else {
      // Update English fields - try multiple patterns to extract company name
      let companyName = '';
      
      // Try pattern 1: Look for span with id containing 'Label1'
      let nameMatch = html.match(/<span[^>]*id=["'][^"']*Label1[^"']*["'][^>]*>([^<]*)<\/span>/i);
      
      // Try pattern 2: Look for the first h2 or h3 tag if first pattern fails
      if (!nameMatch || !nameMatch[1].trim()) {
        nameMatch = html.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i);
      }
      
      // Try pattern 3: Look for any span with class containing 'company' or 'name'
      if (!nameMatch || !nameMatch[1].trim()) {
        nameMatch = html.match(/<span[^>]*class=["'][^"']*(company|name)[^"']*["'][^>]*>([^<]*)<\/span>/i);
        if (nameMatch && nameMatch[2]) {
          nameMatch[1] = nameMatch[2]; // Use the second capture group
        }
      }
      
      // If still no match, try to extract from the title or meta tags
      if (!nameMatch || !nameMatch[1].trim()) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          // Clean up the title (remove extra spaces, newlines, etc.)
          nameMatch = [null, titleMatch[1].replace(/\s+/g, ' ').trim()];
        }
      }
      
      companyData.companyName = (nameMatch && nameMatch[1] ? nameMatch[1].trim() : companyData.companyName || '');
      companyData.sector = getValueByLabel(html, 'Sector') || companyData.sector;
      companyData.symbol = getValueByLabel(html, 'Reuters Code') || companyData.symbol;
      
      // Update details
      companyData.details = {
        parValue: getValueByLabel(html, 'Par Value') || companyData.details.parValue,
        currency: getValueByLabel(html, 'Currency') || companyData.details.currency,
        currencyAr: companyData.details.currencyAr || '',  // Initialize empty if not exists
        listingDate: getValueByLabel(html, 'Listing Date') || companyData.details.listingDate,
        securityType: getValueByLabel(html, 'Security Type') || companyData.details.securityType,
        securityTypeAr: companyData.details.securityTypeAr || '',  // Initialize empty if not exists
        listedShares: getValueByLabel(html, 'Listed shares') || companyData.details.listedShares,
        tradedVolume: getValueByLabel(html, 'Traded Volume') || companyData.details.tradedVolume,
        couponPaymentDate: getValueByLabel(html, 'Coupon Payment Date') || companyData.details.couponPaymentDate,
        tradedValue: getValueByLabel(html, 'Traded Value') || companyData.details.tradedValue,
        priceEarningRatio: getValueByLabel(html, 'Price Earning Ratio') || companyData.details.priceEarningRatio,
        dividendYield: getValueByLabel(html, 'Dividend Yield') || companyData.details.dividendYield,
        cashDividends: getValueByLabel(html, 'Cash Dividends L.E./$') || companyData.details.cashDividends,
        couponNo: getValueByLabel(html, 'Coupon No') || companyData.details.couponNo,
        closingPrice: getValueByLabel(html, 'Closing Price') || companyData.details.closingPrice,
        marketCap: getValueByLabel(html, 'Market Cap.') || companyData.details.marketCap
      };
    }

    // Add any missing data from manual mapping
    const enhancedData = addMissingCompanyData(companyData);
    
    // Update the map
    companiesByIsin.set(isin, enhancedData);
    console.log(`Processed ${isArabic ? 'Arabic' : 'English'} data for ${isin}`);
    
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Function to manually add missing company data
function addMissingCompanyData(companyData) {
  // Manual mapping of ISIN to company names for known missing entries
  const manualMapping = {
    'EGS30291C016': {
      companyName: 'Eastern Company for Food Industries',
      companyNameAr: 'الشرقية الوطنية للامن الغذائي',
      sector: 'Food, Beverages and Tobacco',
      sectorAr: 'أغذية و مشروبات و تبغ',
      symbol: 'ECFI.CA'
    },
    'EGS675S1C011': {
      companyName: 'Amer Group Holding Co.',
      companyNameAr: '(مجموعة عامر القابضة (عامر جروب',
      sector: 'Real Estate',
      sectorAr: 'عقارات',
      symbol: 'AMER.CA'
    }
  };

  if (manualMapping[companyData.isin]) {
    const manualData = manualMapping[companyData.isin];
    return {
      ...companyData,
      companyName: companyData.companyName || manualData.companyName || '',
      companyNameAr: companyData.companyNameAr || manualData.companyNameAr || '',
      sector: companyData.sector || manualData.sector || '',
      sectorAr: companyData.sectorAr || manualData.sectorAr || '',
      symbol: companyData.symbol || manualData.symbol || ''
    };
  }
  return companyData;
}

// Main function to process all files
function processFiles() {
  try {
    console.log('Starting to process detail files...');
    
    // Get all HTML files in the directory
    const files = fs.readdirSync(DETAILS_DIR)
      .filter(file => file.endsWith('.html'))
      .map(file => path.join(DETAILS_DIR, file));

    // Process each file
    for (const file of files) {
      parseCompanyDetails(file);
    }

    // Convert map back to array
    const updatedCompanies = Array.from(companiesByIsin.values());

    // Save the updated data
    fs.writeFileSync(DETAILED_JSON, JSON.stringify(updatedCompanies, null, 2));
    console.log(`\nSuccessfully updated ${DETAILED_JSON}`);
    console.log(`Total companies processed: ${updatedCompanies.length}`);
    
  } catch (error) {
    console.error('Error processing files:', error);
  }
}

// Run the script
processFiles();
