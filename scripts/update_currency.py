import json
import sys

def update_currency_values(file_path):
    # Read the JSON file
    with open(file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    # Count of updated records
    updated_count = 0
    
    # Update currency values
    for company in data:
        if 'details' in company:
            if 'currency' in company['details'] and company['details']['currency'] == 'Egyptian Pound':
                company['details']['currency'] = 'EGP'
                updated_count += 1
            if 'currencyAr' in company['details'] and company['details']['currencyAr'] == 'جنيه مصري':
                company['details']['currencyAr'] = 'ج.م'
    
    # Write the updated data back to the file
    with open(file_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    
    return updated_count

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python update_currency.py <path_to_json_file>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    try:
        count = update_currency_values(file_path)
        print(f"Successfully updated currency values in {count} records.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        sys.exit(1)
