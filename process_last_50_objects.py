import re
import json
from pathlib import Path

def extract_last_n_objects(file_path, n=50):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # This function finds matching closing brace for a given position
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
    
    # Find all complete objects
    objects = []
    i = 0
    while i < len(content):
        if content[i] == '{':
            end_pos = find_matching_brace(content, i)
            if end_pos != -1:
                obj_str = content[i:end_pos+1]
                # Check if it's a complete document (has required fields)
                if 'productId' in obj_str and 'axaCustomerNeedId' in obj_str:
                    objects.append(obj_str)
                i = end_pos + 1
            else:
                i += 1
        else:
            i += 1
    
    # Return the last n objects
    return objects[-n:]

def convert_to_oracle_sql(mongo_doc_str):
    """Convert a MongoDB document string to an Oracle SQL INSERT statement."""
    try:
        # Clean up the document string to make it valid JSON
        doc_str = re.sub(r'Long\(\s*([\d]+)\s*\)', r'\1', mongo_doc_str)
        doc_str = re.sub(r'ISODate\(([^)]+)\)', r'\1', doc_str)
        doc_str = re.sub(r'ObjectId\(([^)]+)\)', r'\1', doc_str)
        doc_str = re.sub(r'\s*([\w]+)\s*:', r'"\1":', doc_str)  # Add quotes around keys
        doc_str = re.sub(r'\s*([\w]+)\s*:', r'"\1":', doc_str)  # Do it twice for nested objects
        doc_str = re.sub(r'([\w]+)\s*:', r'"\1":', doc_str)  # One more time without leading space
        
        # Parse the JSON
        doc = json.loads(doc_str)
        
        # Extract values with defaults
        def get_value(key, default='0'):
            value = doc.get(key, default)
            if isinstance(value, (int, float, str)):
                return str(value)
            if isinstance(value, dict) and '$numberLong' in value:
                return value['$numberLong']
            return str(default)
        
        axa_customer_need_id = get_value('axaCustomerNeedId', '0')
        customer_need_product_cde = get_value('customerNeedProductCde', '0')
        product_id = get_value('productId', '0')
        priority = get_value('priority', '0')
        selection_order = get_value('order', '0')
        health_package_id = get_value('healthPackageId', '0')
        fund_cde = '0'
        premium_amount = get_value('premiumAmount', '0')
        currency_id = get_value('currencyId', '16')
        term = get_value('term', '0')
        nominated_child = get_value('nominatedChildIndex', '0')
        
        # Handle nested child reference
        child_ref_key = '0'
        if 'nominatedChild' in doc and doc['nominatedChild']:
            child_ref = doc['nominatedChild'].get('_id', '0')
            if isinstance(child_ref, dict) and '$numberLong' in child_ref:
                child_ref_key = child_ref['$numberLong']
            else:
                child_ref_key = str(child_ref)
        
        maturity_term = get_value('maturityTerm', '0')
        height = get_value('height', '0')
        weight = get_value('weight', '0')
        package_id_value = get_value('packageId', '0')
        package_amount = get_value('packageAmount', '0')
        contribution_discount = get_value('contributionDiscount', '0')
        greed_premium = get_value('greedPremium', '0')
        frequency = get_value('frequency', '0')
        
        # Fixed values as per mapping
        total_risk_charges = '0'
        rate2 = '0'
        rate1 = '0'
        amount_rate2 = '0'
        amount_rate1 = '0'
        total_premium_paid = '0'
        
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
    {package_id_value},  -- CNP_PACKAGE_CDE
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
            package_id_value=package_id_value,
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
        print(f"Problematic document: {mongo_doc_str[:200]}...")
        return None

def main():
    input_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/mongodb-cleaned-v2.txt'
    output_file = '/home/amawaziny/Projects/other/treviro-main/treviro/data/oracle_inserts.sql'
    
    print(f"Extracting last 50 objects from {input_file}...")
    last_objects = extract_last_n_objects(input_file, 50)
    print(f"Found {len(last_objects)} objects to process.")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Oracle SQL INSERT statements generated from MongoDB data\n")
        f.write("-- Total documents: " + str(len(last_objects)) + "\n\n")
        
        success_count = 0
        for i, obj in enumerate(last_objects, 1):
            sql = convert_to_oracle_sql(obj)
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
