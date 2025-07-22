import json
import sys
from typing import List, Dict, Any

def map_to_listed_security(company: Dict[str, Any]) -> Dict[str, Any]:
    """Map a company entry to the ListedSecurity format with all available details."""
    details = company.get("details", {})
    
    # Create a flat dictionary with all fields
    symbol = company.get("symbol", "").replace(".CA", "")
    security = {
        # Core ListedSecurity fields
        "id": f"{symbol}-EGX",
        "isin": company.get("isin", ""),
        "name": company.get("companyName", ""),
        "name_ar": company.get("companyNameAr", ""),
        "symbol": symbol,  # Using the cleaned symbol without .CA
        "logoUrl": "",  # Not in source data
        "price": details.get("closingPrice", 0),
        "currency": details.get("currency", "EGP"),
        "changePercent": 0,  # Not available in source data
        "market": "EGX",
        "securityType": details.get("securityType", ""),  # Using the full security type directly
        "fundType": "",  # Not available in source data
        "description": "",  # Not available in source data
        
        # Company details
        "sector": company.get("sector", ""),
        "sectorAr": company.get("sectorAr", ""),
        "lastUpdated": company.get("lastUpdated", ""),
        
        # Security details
        "listingDate": details.get("listingDate", ""),
        "securityTypeAr": details.get("securityTypeAr", ""),
        "listedShares": details.get("listedShares", 0),
        "tradedVolume": details.get("tradedVolume", 0),
        "tradedValue": details.get("tradedValue", 0),
        "priceEarningRatio": details.get("priceEarningRatio", 0),
        "dividendYield": details.get("dividendYield", 0),
        "cashDividends": details.get("cashDividends", ""),
        "marketCap": details.get("marketCap", 0),
        "parValue": details.get("parValue", 0),
        "currencyAr": details.get("currencyAr", ""),
        "couponPaymentDate": details.get("couponPaymentDate", ""),
        "couponNo": details.get("couponNo")
    }
    
    return security

def convert_egx_companies_to_securities(input_path: str, output_path: str) -> None:
    """Convert EGX companies data to ListedSecurity format."""
    # Read the source data
    with open(input_path, 'r', encoding='utf-8') as file:
        companies = json.load(file)
    
    # Map each company to the ListedSecurity format
    securities = [map_to_listed_security(company) for company in companies]
    
    # Write the result to the output file
    with open(output_path, 'w', encoding='utf-8') as file:
        json.dump(securities, file, ensure_ascii=False, indent=2)
    
    print(f"Successfully converted {len(securities)} companies to ListedSecurity format.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python map_to_listed_security.py <input_json_path> <output_json_path>")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        convert_egx_companies_to_securities(input_path, output_path)
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        sys.exit(1)
