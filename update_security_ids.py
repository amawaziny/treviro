import json
import os

def update_security_ids(file_path):
    # Read the JSON file
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Update each security's ID
    updated_count = 0
    for security in data:
        current_id = security.get('id', '')
        
        # Skip if already in correct format (EGX-XXXX)
        if current_id.startswith('EGX-'):
            continue
            
        # Update the ID to swap parts around the dash
        if '-' in current_id:
            # Split into parts and swap them
            parts = current_id.split('-')
            if len(parts) == 2:
                new_id = f"{parts[1]}-{parts[0]}"
                security['id'] = new_id
                updated_count += 1
                print(f"Updated ID: {current_id} -> {new_id}")
    
    # Save the updated data back to the file
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nSuccessfully updated {updated_count} security IDs in {file_path}")

if __name__ == "__main__":
    file_path = os.path.join(os.path.dirname(__file__), 'data', 'egx-securities-final.json')
    update_security_ids(file_path)
