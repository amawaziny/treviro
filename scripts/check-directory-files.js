const fs = require('fs');
const path = require('path');

const detailsDir = '/home/amawaziny/Downloads/egx/details';

// Get list of all HTML files in the details directory
const files = fs.readdirSync(detailsDir).filter(file => file.endsWith('.html'));

// Track files
const fileMap = new Map();
const issues = {
    missingEnglish: new Set(),  // Has Arabic but no English
    missingArabic: new Set(),   // Has English but no Arabic
    invalidFormat: []           // Files that don't match expected patterns
};

// First pass: Process all files and categorize them
for (const file of files) {
    const isArabic = file.endsWith('-ar.html');
    const baseName = isArabic ? file.replace('-ar.html', '') : file.replace('.html', '');
    
    // Check if the filename follows the expected pattern (ISIN format)
    if (!/^[A-Z0-9]{12}$/.test(baseName)) {
        issues.invalidFormat.push(file);
        continue;
    }
    
    if (!fileMap.has(baseName)) {
        fileMap.set(baseName, { hasEnglish: false, hasArabic: false });
    }
    
    const entry = fileMap.get(baseName);
    if (isArabic) {
        entry.hasArabic = true;
    } else {
        entry.hasEnglish = true;
    }
}

// Second pass: Identify issues
for (const [baseName, { hasEnglish, hasArabic }] of fileMap.entries()) {
    if (hasEnglish && !hasArabic) {
        issues.missingArabic.add(`${baseName}.html`);
    }
    if (hasArabic && !hasEnglish) {
        issues.missingEnglish.add(`${baseName}-ar.html`);
    }
}

// Generate report
console.log('=== Directory File Consistency Report ===');
console.log(`Total HTML files: ${files.length}`);
console.log(`Unique base files: ${fileMap.size}`);
console.log(`\nFiles with missing English versions: ${issues.missingEnglish.size}`);
console.log([...issues.missingEnglish].sort().join('\n'));
console.log(`\nFiles with missing Arabic versions: ${issues.missingArabic.size}`);
console.log([...issues.missingArabic].sort().join('\n'));

if (issues.invalidFormat.length > 0) {
    console.log(`\nFiles with invalid naming format (${issues.invalidFormat.length}):`);
    console.log(issues.invalidFormat.sort().join('\n'));
}

// Save detailed report
const report = {
    generatedAt: new Date().toISOString(),
    totalFiles: files.length,
    uniqueBaseFiles: fileMap.size,
    filesMissingEnglish: [...issues.missingEnglish].sort(),
    filesMissingArabic: [...issues.missingArabic].sort(),
    invalidFormatFiles: issues.invalidFormat.sort()
};

fs.writeFileSync(
    path.join(__dirname, '../data/directory-consistency-report.json'),
    JSON.stringify(report, null, 2)
);

console.log('\nDetailed report saved to data/directory-consistency-report.json');
