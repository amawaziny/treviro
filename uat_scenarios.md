# User Acceptance Testing Scenarios

## Login Page

### Authentication
1. **Valid Login**
   - **Scenario**: User logs in with valid credentials
   - **Steps**:
     1. Navigate to login page
     2. Enter valid email
     3. Enter valid password
     4. Click login button
   - **Expected**: User is redirected to dashboard
   - **Validation**:
     - Session is maintained
     - No error messages shown
     - Loading state appears during authentication

2. **Invalid Login**
   - **Scenario**: User attempts login with invalid credentials
   - **Steps**:
     1. Navigate to login page
     2. Enter invalid email
     3. Enter invalid password
     4. Click login button
   - **Expected**: Error message displayed
   - **Validation**:
     - Appropriate error message shown
     - Form remains on login page
     - No session created

3. **Password Reset**
   - **Scenario**: User requests password reset
   - **Steps**:
     1. Navigate to login page
     2. Click "Forgot Password"
     3. Enter registered email
     4. Submit reset request
   - **Expected**: Reset instructions sent
   - **Validation**:
     - Confirmation message shown
     - Email received with reset link
     - Reset link works correctly

## Profile Page

### Profile Management
1. **View Profile**
   - **Scenario**: User views their profile information
   - **Steps**:
     1. Navigate to profile page
     2. View profile details
   - **Expected**: All profile information displayed correctly
   - **Validation**:
     - Name displayed correctly
     - Profile picture shown
     - All fields populated

2. **Update Profile**
   - **Scenario**: User updates profile information
   - **Steps**:
     1. Navigate to profile page
     2. Edit name
     3. Update profile picture
     4. Save changes
   - **Expected**: Profile updated successfully
   - **Validation**:
     - Changes saved
     - Success message shown
     - New information displayed

3. **Change Password**
   - **Scenario**: User changes their password
   - **Steps**:
     1. Navigate to profile page
     2. Enter current password
     3. Enter new password
     4. Confirm new password
     5. Save changes
   - **Expected**: Password changed successfully
   - **Validation**:
     - Success message shown
     - Can login with new password
     - Cannot login with old password

## Expenses Page

### Expense Tracking
1. **Add New Expense**
   - **Scenario**: User adds a new expense
   - **Steps**:
     1. Navigate to expenses page
     2. Click "Add Expense"
     3. Select category
     4. Enter amount
     5. Enter date
     6. Add description (optional)
     7. Submit form
   - **Expected**: Expense added successfully
   - **Validation**:
     - Success message shown
     - Expense appears in list
     - Total expenses updated
     - Category totals updated

2. **Add Installment Expense**
   - **Scenario**: User adds a credit card installment expense
   - **Steps**:
     1. Navigate to expenses page
     2. Click "Add Expense"
     3. Select "Credit Card" category
     4. Check "Is Installment" checkbox
     5. Enter total amount
     6. Enter number of installments
     7. Submit form
   - **Expected**: Installment expense added
   - **Validation**:
     - Success message shown
     - Installment plan created
     - Monthly amounts calculated correctly
     - Payment schedule displayed

3. **Edit Expense**
   - **Scenario**: User edits an existing expense
   - **Steps**:
     1. Navigate to expenses page
     2. Find expense to edit
     3. Click edit button
     4. Modify details
     5. Save changes
   - **Expected**: Expense updated successfully
   - **Validation**:
     - Success message shown
     - Changes reflected in list
     - Totals recalculated
     - History maintained

4. **Delete Expense**
   - **Scenario**: User deletes an expense
   - **Steps**:
     1. Navigate to expenses page
     2. Find expense to delete
     3. Click delete button
     4. Confirm deletion
   - **Expected**: Expense deleted successfully
   - **Validation**:
     - Success message shown
     - Expense removed from list
     - Totals recalculated
     - History updated

5. **Filter Expenses**
   - **Scenario**: User filters expense list
   - **Steps**:
     1. Navigate to expenses page
     2. Toggle "Show All" switch
     3. Toggle "Show Ended" switch
   - **Expected**: List filtered correctly
   - **Validation**:
     - Correct expenses shown
     - Totals updated
     - Filters persist

## Dashboard Page

### Financial Overview
1. **View Total Investment**
   - **Scenario**: User views total investment amount
   - **Steps**:
     1. Navigate to dashboard
     2. Check Total Investment Card
   - **Expected**: Correct total displayed
   - **Validation**:
     - Amount matches sum of all investments
     - Percentage change shown
     - Updates in real-time

2. **View Portfolio Allocation**
   - **Scenario**: User views investment distribution
   - **Steps**:
     1. Navigate to dashboard
     2. Check Portfolio Allocation Pie Chart
   - **Expected**: Correct distribution shown
   - **Validation**:
     - Percentages add up to 100%
     - All investment types shown
     - Tooltips show exact values
     - Updates in real-time

3. **View Asset Types**
   - **Scenario**: User views asset type distribution
   - **Steps**:
     1. Navigate to dashboard
     2. Check Asset Type Pie Chart
   - **Expected**: Correct asset distribution shown
   - **Validation**:
     - Percentages add up to 100%
     - All asset types shown
     - Tooltips show exact values
     - Updates in real-time

4. **View Monthly Cash Flow**
   - **Scenario**: User views monthly cash flow
   - **Steps**:
     1. Navigate to dashboard
     2. Check Monthly Cash Flow Card
   - **Expected**: Correct cash flow shown
   - **Validation**:
     - Income displayed
     - Expenses displayed
     - Net cash flow calculated
     - Updates in real-time

## Global Features

### Multi-language Support
1. **Change Language**
   - **Scenario**: User changes application language
   - **Steps**:
     1. Open language selector
     2. Select new language
   - **Expected**: Interface updates to new language
   - **Validation**:
     - All text translated
     - RTL layout applied for Arabic
     - Date format updated
     - Currency format updated

### Mobile Responsiveness
1. **Mobile View**
   - **Scenario**: User accesses on mobile device
   - **Steps**:
     1. Open application on mobile
     2. Navigate through pages
   - **Expected**: Proper mobile layout
   - **Validation**:
     - Bottom tab bar visible
     - Touch targets adequate
     - Content readable
     - Forms usable

2. **Orientation Change**
   - **Scenario**: User changes device orientation
   - **Steps**:
     1. Open application
     2. Rotate device
   - **Expected**: Layout adjusts properly
   - **Validation**:
     - Content remains readable
     - Navigation accessible
     - Forms usable
     - No layout breaks

## Test Environment Requirements
- Test user account with known credentials
- Test data for all investment types
- Mobile device or emulator
- Different screen sizes
- Internet connection
- Offline mode capability

## Test Data Requirements
- Sample expenses in different categories
- Installment plans
- Different investment types
- Multiple currencies
- Various date ranges

## Notes
- Run tests in both English and Arabic
- Test on multiple devices and screen sizes
- Verify all calculations
- Check error handling
- Validate data persistence
- Test offline functionality
- Verify real-time updates 