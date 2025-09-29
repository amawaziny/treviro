import re
from pathlib import Path

def clean_mongodb_file(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # This function will help balance the braces
    def find_matching_brace(text, start_pos):
        balance = 0
        for i in range(start_pos, len(text)):
            if text[i] == '{':
                balance += 1
            elif text[i] == '}':
                balance -= 1
                if balance == 0:
                    return i
        return -1
    
    # Process the content to properly close objects
    cleaned_docs = []
    i = 0
    n = len(content)
    
    while i < n:
        if content[i] == '{':
            # Find the matching closing brace
            end_pos = find_matching_brace(content, i)
            if end_pos != -1:
                doc = content[i:end_pos+1]
                # Remove customerBenefitsModelList and productCharge
                doc = re.sub(r'customerBenefitsModelList\s*:\s*\[[^\]]*\]', '', doc, flags=re.DOTALL)
                doc = re.sub(r'customerBenefitsModelList\s*:\s*\{[^\}]*\}', '', doc, flags=re.DOTALL)
                doc = re.sub(r'productCharge\s*:\s*\[[^\]]*\]', '', doc, flags=re.DOTALL)
                doc = re.sub(r'productCharge\s*:\s*\{[^\}]*\}', '', doc, flags=re.DOTALL)
                
                # Clean up any empty lines or extra commas
                doc = re.sub(r',\s*\n\s*}', '\n}', doc)
                doc = re.sub(r',\s*\n\s*]', '\n]', doc)
                doc = re.sub(r',\s*,', ',', doc)
                
                # Only add if it's a complete document with productId and axaCustomerNeedId
                if 'productId' in doc and 'axaCustomerNeedId' in doc:
                    cleaned_docs.append(doc)
                
                i = end_pos + 1
            else:
                i += 1
        else:
            i += 1
    
    # Write the cleaned documents to the output file
    with open(output_file, 'w', encoding='utf-8') as f:
        for doc in cleaned_docs:
            f.write(doc + '\n\n')
    
    print(f"Processed {len(cleaned_docs)} complete documents. Output written to {output_file}")

if __name__ == "__main__":
    input_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/mongodb-clean.txt'
    output_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/mongodb-cleaned-v2.txt'
    
    clean_mongodb_file(input_file, output_file)
