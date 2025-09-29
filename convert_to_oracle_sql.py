def convert_to_oracle_sql(mongo_doc):
    """
    Convert a MongoDB document to an Oracle SQL INSERT statement.
    """
    # Extract values with defaults
    axa_customer_need_id = mongo_doc.get('axaCustomerNeedId', '0')
    if isinstance(axa_customer_need_id, dict) and '$numberLong' in axa_customer_need_id:
        axa_customer_need_id = axa_customer_need_id['$numberLong']
    
    customer_need_product_cde = mongo_doc.get('customerNeedProductCde', '0')
    if isinstance(customer_need_product_cde, dict) and '$numberLong' in customer_need_product_cde:
        customer_need_product_cde = customer_need_product_cde['$numberLong']
    
    product_id = mongo_doc.get('productId', '0')
    if isinstance(product_id, dict) and '$numberLong' in product_id:
        product_id = product_id['$numberLong']
    
    priority = mongo_doc.get('priority', '0')
    selection_order = mongo_doc.get('order', '0')
    health_package_id = mongo_doc.get('healthPackageId', '0')
    fund_cde = '0'  # Default as per mapping
    premium_amount = mongo_doc.get('premiumAmount', '0')
    currency_id = mongo_doc.get('currencyId', '16')  # Default to 16 as per example
    term = mongo_doc.get('term', '0')
    nominated_child = mongo_doc.get('nominatedChildIndex', '0')
    
    # Handle nested child reference
    child_ref_key = '0'
    if 'nominatedChild' in mongo_doc and mongo_doc['nominatedChild']:
        child_ref = mongo_doc['nominatedChild'].get('_id', '0')
        if isinstance(child_ref, dict) and '$numberLong' in child_ref:
            child_ref_key = child_ref['$numberLong']
        else:
            child_ref_key = str(child_ref)
    
    maturity_term = mongo_doc.get('maturityTerm', '0')
    height = mongo_doc.get('height', '0')
    weight = mongo_doc.get('weight', '0')
    package_id = mongo_doc.get('packageId', '0')
    package_amount = mongo_doc.get('packageAmount', '0')
    contribution_discount = mongo_doc.get('contributionDiscount', '0')
    greed_premium = mongo_doc.get('greedPremium', '0')
    frequency = mongo_doc.get('frequency', '0')
    
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
);
"""
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

# Example usage with the provided document
document = {
    'productId': '71',
    'axaCustomerNeedId': '653892',
    'investmentFunds': [
        {
            '_id': 19,
            'percentage': 100
        }
    ],
    'maturityTerm': 48,
    'premiumAmount': 0,
    'greedPremium': 1500,
    'frequency': 12,
    'term': 10,
    'packageId': 2,
    'currencyId': 16,
    'currencyName': 'EGP',
    'monthlyIncome': '20000',
    'lastModified': '9/29/25, 11:44 AM',
    '_class': 'com.axa.product.management.repository.product.entity.CustomerNeedProductDocument'
}

# Generate the SQL
sql = convert_to_oracle_sql(document)
print(sql)
