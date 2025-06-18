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
