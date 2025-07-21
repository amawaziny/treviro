import json
from pathlib import Path

def load_isins(file_path):
    """Load ISINs from a JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return set(json.load(f))

def load_detailed_isins(file_path):
    """Load ISINs from the detailed companies JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return {item['isin'] for item in data if 'isin' in item}

def main():
    # Define file paths
    base_dir = Path('data')
    isins_file = base_dir / 'egx-isins.json'
    detailed_file = base_dir / 'egx-companies-detailed.json'
    
    # Load ISINs from both files
    isins = load_isins(isins_file)
    detailed_isins = load_detailed_isins(detailed_file)
    
    # Find differences
    in_isins_not_detailed = isins - detailed_isins
    in_detailed_not_isins = detailed_isins - isins
    
    # Print results
    print(f"Total ISINs in egx-isins.json: {len(isins)}")
    print(f"Total ISINs in egx-companies-detailed.json: {len(detailed_isins)}")
    
    print("\nISINs in egx-isins.json but NOT in egx-companies-detailed.json:")
    if in_isins_not_detailed:
        for isin in sorted(in_isins_not_detailed):
            print(f"- {isin}")
    else:
        print("  None")
    
    print("\nISINs in egx-companies-detailed.json but NOT in egx-isins.json:")
    if in_detailed_not_isins:
        for isin in sorted(in_detailed_not_isins):
            print(f"- {isin}")
    else:
        print("  None")
    
    # Save results to a file
    output = {
        "generated_at": "2025-07-22T00:17:01+03:00",
        "total_in_isins": len(isins),
        "total_in_detailed": len(detailed_isins),
        "missing_in_detailed": sorted(list(in_isins_not_detailed)),
        "extra_in_detailed": sorted(list(in_detailed_not_isins)),
        "is_consistent": not (in_isins_not_detailed or in_detailed_not_isins)
    }
    
    output_file = base_dir / 'isin-comparison-report.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nDetailed report saved to: {output_file}")

if __name__ == "__main__":
    main()
