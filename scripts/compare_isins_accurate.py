import json
import os
from pathlib import Path

def load_isins_from_json(file_path):
    """Load ISINs from a JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return set(json.load(f))

def extract_isins_from_html_filenames(directory):
    """Extract ISINs from HTML filenames in the given directory."""
    isins = set()
    
    for filename in os.listdir(directory):
        # Skip non-HTML files and Arabic versions (they have the same ISIN as English)
        if not filename.endswith('.html') or '-ar.html' in filename:
            continue
            
        # Extract the ISIN part (everything before .html)
        isin = filename.replace('.html', '')
        isins.add(isin)
            
    return isins

def compare_isins(isins_json, isins_html):
    """Compare two sets of ISINs and return the comparison results."""
    return {
        'in_json_not_in_html': sorted(list(isins_json - isins_html)),
        'in_html_not_in_json': sorted(list(isins_html - isins_json)),
        'common': sorted(list(isins_json & isins_html)),
        'count_json': len(isins_json),
        'count_html': len(isins_html),
        'count_common': len(isins_json & isins_html)
    }

def main():
    # Define paths
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / 'data'
    html_dir = Path('/home/amawaziny/Downloads/egx/details')
    
    # Load ISINs from JSON
    json_isins = load_isins_from_json(data_dir / 'egx-isins.json')
    
    # Extract ISINs from HTML filenames
    html_isins = extract_isins_from_html_filenames(html_dir)
    
    # Compare the ISINs
    comparison = compare_isins(json_isins, html_isins)
    
    # Print summary
    print(f"ISINs in JSON: {comparison['count_json']}")
    print(f"ISINs in HTML files: {comparison['count_html']}")
    print(f"Common ISINs: {comparison['count_common']}")
    print(f"\nISINs in JSON but not in HTML files ({len(comparison['in_json_not_in_html'])}):")
    for isin in comparison['in_json_not_in_html']:
        print(f"  - {isin}")
    
    print(f"\nISINs in HTML files but not in JSON ({len(comparison['in_html_not_in_json'])}):")
    for isin in comparison['in_html_not_in_json']:
        print(f"  - {isin}")
    
    # Save detailed report
    report_path = data_dir / 'isin-comparison-accurate-report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(comparison, f, indent=2, ensure_ascii=False)
    
    print(f"\nDetailed report saved to: {report_path}")

if __name__ == "__main__":
    main()
