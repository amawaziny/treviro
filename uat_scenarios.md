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

## Profile Management

### Profile Information

1. **View Profile Information**

   - **Scenario**: User views their profile details
   - **Steps**:
     1. Navigate to profile page
     2. View profile section
   - **Expected**: Profile information displayed correctly
   - **Validation**:
     - Profile title is visible
     - Profile image is displayed
     - User name is shown
     - Email matches logged-in user's email
     - Name input field is visible

2. **Update Profile Name**

   - **Scenario**: User updates their display name
   - **Steps**:
     1. Navigate to profile page
     2. Enter new name in name input
     3. Click save button
   - **Expected**: Name updated successfully
   - **Validation**:
     - Success message appears
     - New name persists after page refresh
     - Profile header shows updated name

3. **Toggle Password Visibility**

   - **Scenario**: User toggles password visibility
   - **Steps**:
     1. Navigate to profile page (for password users)
     2. Locate password field
     3. Click visibility toggle
   - **Expected**: Password visibility changes
   - **Validation**:
     - Password is hidden by default (type="password")
     - Toggle shows password (type="text")
     - Toggle hides password again

4. **Profile Save Loading State**

   - **Scenario**: User saves profile changes
   - **Steps**:
     1. Navigate to profile page
     2. Make a change
     3. Click save button
   - **Expected**: Proper loading state during save
   - **Validation**:
     - Save button is disabled during save
     - Button re-enables after save completes
     - No form interaction during save

5. **Profile Image Upload**
   - **Scenario**: User uploads a new profile image
   - **Steps**:
     1. Navigate to profile page
     2. Click to upload image
     3. Select image file
   - **Expected**: Image upload starts
   - **Validation**:
     - Upload status message appears
     - File input accepts images
     - Progress feedback shown during upload

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

## Debt Management

### Certificate Creation and Projection

1. **Create Debt Certificate and Validate Projection**

   - **Scenario**: User creates a new Direct Debt Certificate and verifies the projection in Debts and Dashboard
   - **Precondition**: User is logged into the Trivero mobile app
   - **Steps**:
     1. Navigate to the "Debts" screen
     2. Tap "Add New Debt Certificate"
     3. Enter the following details:
        - Total Cost: 100,000
        - Issuer: Ahly Bank
        - Expiry Date: 12-1-2026
        - Interest Rate: 10%
     4. Save the certificate
   - **Expected Results**:
     - ✅ The certificate is successfully saved and appears in the Direct Debt List on the Debts screen
     - ✅ The projection amount based on the 10% interest rate appears in the "Income" section of the Dashboard
     - ✅ If today's date is the 12th of the month, the projection amount also appears in the "Current Income" section of the Dashboard
     - ✅ The same projection amount appears in the Summary section of the Debts screen
   - **Validation**:
     - Verify certificate details match the input values
     - Confirm projection calculations are accurate
     - Check that the projection updates correctly on the 12th of each month
     - Ensure data consistency between Debts and Dashboard views

## Expenses Management

### Adding Expenses

1. **Navigate to Add Expense Page**

   - **Scenario**: User accesses the expense creation form
   - **Steps**:
     1. Go to expenses page
     2. Click "Add Expense" button
   - **Expected**: Add expense form is displayed
   - **Validation**:
     - URL updates to /expenses/add
     - Form is visible with all required fields
     - Form has correct test IDs for automation

2. **Add New Expense**

   - **Scenario**: User adds a regular expense
   - **Steps**:
     1. Open add expense form
     2. Select category
     3. Enter description
     4. Input amount
     5. Set date
     6. Submit form
   - **Expected**: Expense is saved successfully
   - **Validation**:
     - Success toast appears
     - Form is submitted
     - User is redirected to expenses list

3. **Add Installment Expense**

   - **Scenario**: User adds an installment-based expense
   - **Steps**:
     1. Open add expense form
     2. Select "Credit Card" category
     3. Toggle installment option
     4. Enter number of installments
     5. Fill other required fields
     6. Submit form
   - **Expected**: Installment expense is created
   - **Validation**:
     - Success message shown
     - Installment plan is saved
     - All installments are created

### Form Validation

1. **Required Fields Validation**

   - **Scenario**: User submits empty form
   - **Steps**:
     1. Open add expense form
     2. Click submit without filling fields
   - **Expected**: Validation errors appear
   - **Validation**:
     - Error for amount field
     - Form is not submitted

2. **Invalid Amount Validation**

   - **Scenario**: User enters invalid amount
   - **Steps**:
     1. Open add expense form
     2. Enter "0" in amount field
     3. Submit form
   - **Expected**: Specific error message appears
   - **Validation**:
     - "Amount cannot be less than 1" error shown
     - Form is not submitted

3. **Missing Installment Details**

   - **Scenario**: User selects installment without details
   - **Steps**:
     1. Open add expense form
     2. Select "Credit Card" category
     3. Check installment option
     4. Don't enter installments
     5. Submit form
   - **Expected**: Installment validation error
   - **Validation**:
     - "Number of months is required" error shown
     - Form is not submitted

### Managing Expenses

1. **Edit Existing Expense**

   - **Scenario**: User modifies an expense
   - **Steps**:
     1. Go to expenses list
     2. Find and click edit on an expense
     3. Update description
     4. Save changes
   - **Expected**: Expense is updated
   - **Validation**:
     - Success message appears
     - Changes are saved
     - Updated info appears in list

2. **Delete Expense**

   - **Scenario**: User removes an expense
   - **Steps**:
     1. Go to expenses list
     2. Click delete on an expense
     3. Confirm deletion
   - **Expected**: Expense is removed
   - **Validation**:
     - Confirmation dialog appears
     - Success message shown
     - Expense disappears from list

### Filtering Expenses

1. **Toggle Expense Filters**

   - **Scenario**: User filters expense list
   - **Steps**:
     1. Go to expenses page
     2. Toggle "Show All" switch
     3. Toggle "Show Ended" switch
   - **Expected**: List updates based on filters
   - **Validation**:
     - Toggle states change correctly
     - List filters accordingly
     - UI updates to reflect changes

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
