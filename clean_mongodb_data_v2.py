import re
from pathlib import Path

def clean_mongodb_file(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split the file into individual documents
    # Each document starts with "{" and ends with "}"
    pattern = r'\{\s*[\s\S]*?\}'
    documents = re.findall(pattern, content)
    
    cleaned_docs = []
    
    for doc in documents:
        # Remove customerBenefitsModelList and productCharge fields using regex
        # This handles the fields even if they contain nested objects/arrays
        
        # Remove customerBenefitsModelList
        doc = re.sub(r'customerBenefitsModelList\s*:\s*\[[^\]]*\]', '', doc, flags=re.DOTALL)
        doc = re.sub(r'customerBenefitsModelList\s*:\s*\{[^\}]*\}', '', doc, flags=re.DOTALL)
        
        # Remove productCharge
        doc = re.sub(r'productCharge\s*:\s*\[[^\]]*\]', '', doc, flags=re.DOTALL)
        doc = re.sub(r'productCharge\s*:\s*\{[^\}]*\}', '', doc, flags=re.DOTALL)
        
        # Clean up any empty lines or extra commas
        doc = re.sub(r',\s*\n\s*}', '\n}', doc)  # Remove trailing comma before }
        doc = re.sub(r',\s*\n\s*]', '\n]', doc)    # Remove trailing comma before ]
        doc = re.sub(r',\s*,', ',', doc)           # Remove double commas
        
        cleaned_docs.append(doc)
    
    # Write the cleaned documents to the output file
    with open(output_file, 'w', encoding='utf-8') as f:
        for doc in cleaned_docs:
            f.write(doc + '\n\n')
    
    print(f"Processed {len(cleaned_docs)} documents. Output written to {output_file}")

if __name__ == "__main__":
    input_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/mongodb-clean.txt'
    output_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/mongodb-cleaned.txt'
    
    clean_mongodb_file(input_file, output_file)
