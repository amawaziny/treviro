import re
from pathlib import Path

def extract_field(text, field_name, default='0'):
    """Extract a field value from MongoDB document text."""
    # Handle Long() values
    pattern1 = fr"{field_name}: Long\('([^']+)'\)"
    # Handle regular values
    pattern2 = fr"{field_name}: ([^,\n]+)"
    # Handle string values with quotes
    pattern3 = fr"{field_name}: '([^']+)'"
    
    for pattern in [pattern1, pattern2, pattern3]:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    
    # For nested objects, return empty string to be handled by caller
    if any(field_name in line and '{' in line for line in text.split('\n')):
        return ''
    
    return default

def extract_last_n_objects(file_path, n=50):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split into individual documents
    docs = []
    current_doc = []
    brace_count = 0
    
    for line in content.split('\n'):
        line = line.strip()
        if line == '{':
            if brace_count == 0:
                current_doc = [line]
            else:
                current_doc.append(line)
            brace_count += 1
        elif line == '}':
            brace_count -= 1
            if brace_count == 0:
                current_doc.append(line)
                docs.append('\n'.join(current_doc))
                current_doc = []
            else:
                current_doc.append(line)
        elif current_doc:
            current_doc.append(line)
    
    # Return the last n documents that have the required fields
    valid_docs = []
    for doc in reversed(docs):
        if 'productId' in doc and 'axaCustomerNeedId' in doc:
            valid_docs.append(doc)
            if len(valid_docs) >= n:
                break
    
    return list(reversed(valid_docs))

def convert_to_oracle_sql(doc_text):
    """Convert a MongoDB document text to an Oracle SQL INSERT statement."""
    try:
        # Extract all fields
        product_id = extract_field(doc_text, 'productId', '0')
        axa_customer_need_id = extract_field(doc_text, 'axaCustomerNeedId', '0')
        customer_need_product_cde = extract_field(doc_text, 'customerNeedProductCde', '0')
        priority = extract_field(doc_text, 'priority', '0')
        selection_order = extract_field(doc_text, 'order', '0')
        health_package_id = extract_field(doc_text, 'healthPackageId', '0')
        premium_amount = extract_field(doc_text, 'premiumAmount', '0')
        currency_id = extract_field(doc_text, 'currencyId', '16')
        term = extract_field(doc_text, 'term', '0')
        nominated_child = extract_field(doc_text, 'nominatedChildIndex', '0')
        maturity_term = extract_field(doc_text, 'maturityTerm', '0')
        height = extract_field(doc_text, 'height', '0')
        weight = extract_field(doc_text, 'weight', '0')
        package_id = extract_field(doc_text, 'packageId', '0')
        package_amount = extract_field(doc_text, 'packageAmount', '0')
        contribution_discount = extract_field(doc_text, 'contributionDiscount', '0')
        greed_premium = extract_field(doc_text, 'greedPremium', '0')
        frequency = extract_field(doc_text, 'frequency', '0')
        
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
        def clean_number(value):
            try:
                return str(int(float(value)))
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
        
        # Construct SQL
        sql = f"""INSERT INTO NP_CUSTOMER_NEED_PRODUCT (
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
    SEQ_CUSTOMER_NEED_PRODUCT.NEXTVAL,
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
        
        return sql.format(
            axa_customer_need_id=axa_customer_need_id,
            customer_need_product_cde=customer_need_product_cde,
            product_id=product_id,
            priority=priority,
            selection_order=selection_order,
            health_package_id=health_package_id,
            fund_cde=fund_cde,
            premium_amount=premium_amount,
            currency_id=currency_id,
            term=term,
            nominated_child=nominated_child,
            child_ref_key=child_ref_key,
            maturity_term=maturity_term,
            height=height,
            weight=weight,
            package_id=package_id,
            package_amount=package_amount,
            contribution_discount=contribution_discount,
            greed_premium=greed_premium,
            frequency=frequency,
            total_risk_charges=total_risk_charges,
            rate2=rate2,
            rate1=rate1,
            amount_rate2=amount_rate2,
            amount_rate1=amount_rate1,
            total_premium_paid=total_premium_paid
        )
    
    except Exception as e:
        print(f"Error processing document: {e}")
        print(f"Problematic document: {doc_text[:200]}...")
        return None

def main():
    input_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/mongodb-cleaned-v2.txt'
    output_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/oracle_inserts_v2.sql'
    
    print(f"Extracting last 50 objects from {input_file}...")
    last_objects = extract_last_n_objects(input_file, 50)
    print(f"Found {len(last_objects)} objects to process.")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Oracle SQL INSERT statements generated from MongoDB data\n")
        f.write("-- Total documents: " + str(len(last_objects)) + "\n\n")
        
        success_count = 0
        for i, doc in enumerate(last_objects, 1):
            sql = convert_to_oracle_sql(doc)
            if sql:
                f.write(sql)
                f.write("\n\n")
                success_count += 1
                if i % 10 == 0:
                    print(f"Processed {i}/{len(last_objects)} documents...")
    
    print(f"\nSuccessfully processed {success_count} out of {len(last_objects)} documents.")
    print(f"SQL INSERT statements have been written to: {output_file}")

if __name__ == "__main__":
    main()
