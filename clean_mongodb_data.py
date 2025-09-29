import re
import json
from pathlib import Path

def clean_mongodb_file(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split the file into individual JSON objects
    # This regex pattern matches MongoDB document patterns
    pattern = r'\{\s*[\s\S]*?\}'
    documents = re.findall(pattern, content)
    
    cleaned_docs = []
    
    for doc in documents:
        try:
            # Clean up the document to make it valid JSON
            # Replace MongoDB Long() with regular numbers
            doc = re.sub(r'Long\(\s*([\d]+)\s*\)', r'\1', doc)
            # Replace MongoDB ISODate with regular date string
            doc = re.sub(r'ISODate\(([^)]+)\)', r'\1', doc)
            # Replace ObjectId with string
            doc = re.sub(r'ObjectId\(([^)]+)\)', r'\1', doc)
            
            # Parse the JSON
            data = json.loads(doc)
            
            # Remove the unwanted fields if they exist
            data.pop('customerBenefitsModelList', None)
            data.pop('productCharge', None)
            
            # Convert back to string with proper formatting
            cleaned_doc = json.dumps(data, indent=2, ensure_ascii=False)
            cleaned_docs.append(cleaned_doc)
            
        except json.JSONDecodeError as e:
            print(f"Error parsing document: {e}")
            print(f"Problematic document: {doc[:200]}...")  # Print first 200 chars of problematic doc
    
    # Write the cleaned documents to the output file
    with open(output_file, 'w', encoding='utf-8') as f:
        for doc in cleaned_docs:
            f.write(doc + '\n')
    
    print(f"Cleaned {len(cleaned_docs)} documents. Output written to {output_file}")

if __name__ == "__main__":
    input_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/mongodb-clean.txt'
    output_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/mongodb-cleaned.txt'
    
    clean_mongodb_file(input_file, output_file)
