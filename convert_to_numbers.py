import json
import re
from pathlib import Path

def convert_value(value):
    """Convert string value to number, handling commas and empty strings."""
    if isinstance(value, str):
        # Remove all non-numeric characters except decimal point and negative sign
        clean_value = re.sub(r'[^\d.-]', '', value)
        if not clean_value or clean_value == '-':
            return 0
        try:
            # Convert to float if it has a decimal point, otherwise int
            return float(clean_value) if '.' in clean_value else int(clean_value)
        except (ValueError, TypeError):
            return value
    return value

def main():
    # Path to the input JSON file
    input_file = Path('data/egx-companies-detailed.json')
    
    # Read the JSON data
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Fields to convert to numbers
    fields_to_convert = [
        'listedShares', 'tradedVolume', 'tradedValue',
        'priceEarningRatio', 'dividendYield', 'couponNo', 'marketCap',
        'parValue', 'closingPrice'  
    ]
    
    # Convert the specified fields to numbers
    for company in data:
        if 'details' in company and isinstance(company['details'], dict):
            for field in fields_to_convert:
                if field in company['details']:
                    company['details'][field] = convert_value(company['details'][field])
    
    # Write the updated data back to the file
    with open(input_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"Successfully converted numeric fields in {input_file}")
    
    # Print a sample of the changes
    sample = next((c for c in data if 'details' in c and 'marketCap' in c['details']), None)
    if sample:
        print("\nSample of converted data:")
        print(f"Company: {sample.get('companyName')}")
        print(f"Symbol: {sample.get('symbol')}")
        print("Details:", {k: v for k, v in sample['details'].items() 
                          if k in fields_to_convert})

if __name__ == "__main__":
    main()
