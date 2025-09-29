import re
from pathlib import Path

def extract_field(text, field_name, default='0'):
    """Extract a field value from MongoDB document text."""
    # Handle Long() values
    pattern1 = fr"{field_name}: Long\('([^']+)'\)"
    # Handle numeric values (including decimals)
    pattern2 = fr"{field_name}:\s*([-+]?\d*\.?\d+)"
    # Handle string values with quotes
    pattern3 = fr"{field_name}: '([^']+)'"
    
    # First try to match Long() values
    match = re.search(pattern1, text)
    if match:
        return match.group(1).strip()
    
    # Then try to match numeric values (including decimals)
    match = re.search(pattern2, text)
    if match:
        value = match.group(1).strip()
        # If it's a number with decimal point, return it as is
        if '.' in value:
            return value
        # If it's an integer, return it without decimal part
        return value
    
    # Finally try to match quoted strings
    match = re.search(pattern3, text)
    if match:
        return match.group(1).strip()
    
    # For nested objects, return empty string to be handled by caller
    if any(field_name in line and '{' in line for line in text.split('\n')):
        return ''
    
    return default

def extract_objects(file_path, start_idx=0, max_objects=50):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Total content length: {len(content)} characters")
    
    # First, try to split by '}\n\n{' which is the document separator
    raw_docs = content.split('}\n\n{')
    print(f"Found {len(raw_docs)} potential documents after splitting")
    
    docs = []
    # Add back the braces we lost in splitting
    if raw_docs:
        # First document
        doc = raw_docs[0].strip()
        if doc.startswith('{') and doc.endswith('}'):
            docs.append(doc)
        elif doc.startswith('{'):
            docs.append(doc + '}')
        
        # Middle documents
        for doc in raw_docs[1:-1]:
            doc = doc.strip()
            if doc:
                docs.append('{' + doc + '}')
        
        # Last document
        if len(raw_docs) > 1:
            doc = raw_docs[-1].strip()
            if doc.endswith('}'):
                docs.append('{' + doc)
            else:
                docs.append('{' + doc + '}')
    
    print(f"After reconstruction, have {len(docs)} documents")
    
    # Filter for valid documents with required fields
    valid_docs = []
    for i, doc in enumerate(docs):
        if len(valid_docs) >= max_objects + start_idx:
            break
            
        has_product_id = 'productId' in doc
        has_axa_id = 'axaCustomerNeedId' in doc
        brace_match = doc.count('{') == doc.count('}')
        
        if has_product_id and has_axa_id and brace_match:
            valid_docs.append(doc)
        else:
            print(f"Document {i+1} validation - productId: {has_product_id}, axaCustomerNeedId: {has_axa_id}, braces match: {brace_match}")
    
    # Return only the requested range of documents
    valid_docs = valid_docs[start_idx:start_idx + max_objects]
    print(f"Found {len(valid_docs)} valid documents (starting from index {start_idx})")
    return valid_docs

def convert_to_oracle_sql(doc_text):
    """Convert a MongoDB document text to an Oracle SQL INSERT statement."""
    try:
        # Extract all fields with debug info
        def safe_extract(field_name, default='0'):
            try:
                value = extract_field(doc_text, field_name, default)
                return value
            except Exception as e:
                print(f"Error extracting {field_name}: {str(e)}")
                return default
        
        # Extract all fields with safe extraction
        product_id = safe_extract('productId', '0')
        axa_customer_need_id = safe_extract('axaCustomerNeedId', '0')
        customer_need_product_cde = safe_extract('customerNeedProductCde', '0')
        priority = safe_extract('priority', '0')
        selection_order = safe_extract('order', '0')
        health_package_id = safe_extract('healthPackageId', '0')
        premium_amount = safe_extract('premiumAmount', '0')
        currency_id = safe_extract('currencyId', '16')
        term = safe_extract('term', '0')
        nominated_child = safe_extract('nominatedChildIndex', '0')
        maturity_term = safe_extract('maturityTerm', '0')
        height = safe_extract('height', '0')
        weight = safe_extract('weight', '0')
        package_id = safe_extract('packageId', '0')
        package_amount = safe_extract('packageAmount', '0')
        contribution_discount = safe_extract('contributionDiscount', '0')
        greed_premium = safe_extract('greedPremium', '0')
        frequency = safe_extract('frequency', '0')
        
        # Handle child reference if it exists
        child_ref_key = '0'
        if 'nominatedChild' in doc_text and 'nominatedChild: {' in doc_text:
            child_ref = extract_field(doc_text, '_id', '0')
            if child_ref and child_ref != '0':
                child_ref_key = child_ref
        
        # Fixed values as per mapping
        fund_cde = '0'
        total_risk_charges = '0'
        rate2 = '0'
        rate1 = '0'
        amount_rate2 = '0'
        amount_rate1 = '0'
        total_premium_paid = '0'
        
        # Clean up numeric values
        def clean_number(value, force_int=False):
            try:
                # Remove any non-numeric characters except decimal point and negative sign
                cleaned = re.sub(r'[^0-9.-]', '', str(value))
                if not cleaned:  # If empty after cleaning
                    return '0'
                
                # Convert to float first to handle decimal points
                num = float(cleaned)
                
                # If the number is an integer and we're not forcing float, return as int
                if num.is_integer() and not force_int:
                    return str(int(num))
                # Otherwise return as is (with decimals)
                return str(num)
            except (ValueError, TypeError):
                return '0'
        
        # Clean numeric fields
        product_id = clean_number(product_id)
        axa_customer_need_id = clean_number(axa_customer_need_id)
        customer_need_product_cde = clean_number(customer_need_product_cde)
        priority = clean_number(priority)
        selection_order = clean_number(selection_order)
        health_package_id = clean_number(health_package_id)
        premium_amount = clean_number(premium_amount)
        currency_id = clean_number(currency_id)
        term = clean_number(term)
        nominated_child = clean_number(nominated_child)
        maturity_term = clean_number(maturity_term)
        height = clean_number(height)
        weight = clean_number(weight)
        package_id = clean_number(package_id)
        package_amount = clean_number(package_amount)
        contribution_discount = clean_number(contribution_discount)
        greed_premium = clean_number(greed_premium)
        frequency = clean_number(frequency)
        
        # Format numbers for SQL (preserve decimals)
        def format_number(value):
            try:
                # If it's a string that can be converted to a float, do so to handle scientific notation
                float_val = float(value)
                # If it's an integer, return as int, otherwise return as is
                if float_val.is_integer():
                    return str(int(float_val))
                return str(float_val)
            except (ValueError, TypeError):
                return str(value) if value else '0'
        
        # Create a dictionary of all formatted values
        formatted_values = {
            'axa_customer_need_id': format_number(axa_customer_need_id),
            'customer_need_product_cde': format_number(customer_need_product_cde),
            'product_id': format_number(product_id),
            'priority': format_number(priority),
            'selection_order': format_number(selection_order),
            'health_package_id': format_number(health_package_id),
            'fund_cde': format_number(fund_cde),
            'premium_amount': format_number(premium_amount),
            'currency_id': format_number(currency_id),
            'term': format_number(term),
            'nominated_child': format_number(nominated_child),
            'child_ref_key': format_number(child_ref_key),
            'maturity_term': format_number(maturity_term),
            'height': format_number(height),
            'weight': format_number(weight),
            'package_id': format_number(package_id),
            'package_amount': format_number(package_amount),
            'contribution_discount': format_number(contribution_discount),
            'greed_premium': format_number(greed_premium),
            'frequency': format_number(frequency),
            'total_risk_charges': format_number(total_risk_charges),
            'rate2': format_number(rate2),
            'rate1': format_number(rate1),
            'amount_rate2': format_number(amount_rate2),
            'amount_rate1': format_number(amount_rate1),
            'total_premium_paid': format_number(total_premium_paid)
        }
        
        # Construct SQL with properly formatted values
        sql = """INSERT INTO NP_CUSTOMER_NEED_PRODUCT (
    CUSTOMER_NEED_PRODUCT_KEY,
    CNP_NEED_CDE,
    CNP_NEEDPRODUCT_CDE,
    CNP_MAIN_PRODUCT_CDE,
    CNP_PRODUCT_CDE,
    CNP_PRIORITY,
    SELECTION_ORDER,
    CNP_HEALTH_PACKAGE_CDE,
    CNP_FUND_CDE,
    CNP_PREMIUM_AMOUNT,
    CNP_CURRENCY_CDE,
    CNP_TERM,
    CNP_NOMINATEDCHILD,
    CNP_CHILD_REF_KEY,
    CNP_MATURITYTERM,
    CNP_HEIGHT,
    CNP_WEIGHT,
    CNP_PACKAGE_CDE,
    CNP_PACKAGE_AMOUNT,
    CNP_CONTRIBUTION_DISCOUNT,
    CNP_GREED_PREMIUM,
    CNP_FREQUENCY_CDE,
    CNP_Total_Risk_Charges,
    CNP_Rate2,
    CNP_Rate1,
    CNP_AMOUNTRATE2,
    CNP_AMOUNTRATE1,
    CNP_TOTAL_PREMIUM_PAID
) VALUES (
    SEQ_CNP_NEED_PRODUCT.NEXTVAL,
    {axa_customer_need_id},  -- CNP_NEED_CDE
    {customer_need_product_cde},  -- CNP_NEEDPRODUCT_CDE
    {product_id},  -- CNP_MAIN_PRODUCT_CDE
    {product_id},  -- CNP_PRODUCT_CDE
    {priority},  -- CNP_PRIORITY
    {selection_order},  -- SELECTION_ORDER
    {health_package_id},  -- CNP_HEALTH_PACKAGE_CDE
    {fund_cde},  -- CNP_FUND_CDE
    {premium_amount},  -- CNP_PREMIUM_AMOUNT
    {currency_id},  -- CNP_CURRENCY_CDE
    {term},  -- CNP_TERM
    {nominated_child},  -- CNP_NOMINATEDCHILD
    {child_ref_key},  -- CNP_CHILD_REF_KEY
    {maturity_term},  -- CNP_MATURITYTERM
    {height},  -- CNP_HEIGHT
    {weight},  -- CNP_WEIGHT
    {package_id},  -- CNP_PACKAGE_CDE
    {package_amount},  -- CNP_PACKAGE_AMOUNT
    {contribution_discount},  -- CNP_CONTRIBUTION_DISCOUNT
    {greed_premium},  -- CNP_GREED_PREMIUM
    {frequency},  -- CNP_FREQUENCY_CDE
    {total_risk_charges},  -- CNP_Total_Risk_Charges
    {rate2},  -- CNP_Rate2
    {rate1},  -- CNP_Rate1
    {amount_rate2},  -- CNP_AMOUNTRATE2
    {amount_rate1},  -- CNP_AMOUNTRATE1
    {total_premium_paid}  -- CNP_TOTAL_PREMIUM_PAID
);"""
        
        # Format the SQL with the values
        return sql.format(**formatted_values)
        
    except Exception as e:
        print(f"Error processing document: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    # Using the cleaned version of the file
    input_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/mongodb-cleaned-v2.txt'
    output_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/oracle_inserts_50_2.sql'
    
    # Process next 50 documents (documents 50-99)
    start_idx = 50
    batch_size = 50
    
    print(f"Extracting objects {start_idx+1} to {start_idx + batch_size} from {input_file}...")
    docs = extract_objects(input_file, start_idx, batch_size)
    print(f"Found {len(docs)} valid documents to process.")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Oracle SQL INSERT statements generated from MongoDB data\n")
        f.write(f"-- Documents {start_idx+1} to {start_idx + len(docs)}\n\n")
        
        success_count = 0
        for i, doc in enumerate(docs, 1):
            try:
                sql = convert_to_oracle_sql(doc)
                if sql:
                    f.write(sql)
                    f.write("\n\n")
                    success_count += 1
                
                if i % 10 == 0:
                    print(f"Processed {i}/{len(docs)} documents...")
            except Exception as e:
                print(f"Error processing document {i}: {str(e)}")
    
    print(f"\nSuccessfully processed {success_count} out of {len(docs)} documents.")
    print(f"SQL INSERT statements have been written to: {output_file}")

if __name__ == "__main__":
    main()
