# E2E Test Suite for Tasavia

## Overview
This directory contains comprehensive end-to-end tests for the Tasavia application using Playwright. The tests cover authentication, navigation, and CRUD operations for the main application features.

## Test Files

### Core Tests
- **`auth.setup.ts`** - Authentication setup for other tests (creates user session)
- **`auth-flow.spec.ts`** - Complete authentication flow testing (login, logout, validation)
- **`basic-navigation.spec.ts`** - Basic application navigation and UI component testing
- **`my-companies-updated.spec.ts`** - My Companies CRUD operations with proper error handling

### Feature Tests  
- **`dashboard.spec.ts`** - Dashboard functionality and metrics display
- **`purchase-orders.spec.ts`** - Purchase order management workflows
- **`inventory.spec.ts`** - Inventory management operations
- **`part-numbers.spec.ts`** - Part numbers management

### Support Files
- **`lib/data.ts`** - Helper functions for creating/deleting test data
- **`lib/supabase.ts`** - Supabase client configuration for tests

## Key Improvements Made

### 1. Authentication Fixes
- **URL Pattern Matching**: Fixed `**/portal**` to `**/portal/**` to handle `/portal/dashboard` redirects
- **Proper Selectors**: Use "Welcome Back" heading instead of generic "login" text
- **Better Timeouts**: Increased timeouts to handle network delays
- **Multi-element Handling**: Use `.first()` for selectors that match multiple elements

### 2. Form Selector Updates
Based on MCP analysis, form fields should use `name` attributes instead of labels:

```javascript
// ❌ Old (doesn't work)
await page.getByLabel('Company Name').fill(value);

// ✅ New (works correctly)  
await page.fill('input[name="my_company_name"]', value);
```

### 3. Error Handling
- **Database Connection Issues**: Tests now gracefully handle "Failed to fetch companies" errors
- **Toast Notifications**: Check for Sonner toast messages (`[data-sonner-toast]`)
- **Form Validation**: Proper validation testing and error state handling

### 4. Robust Selectors
- **Specific Text Matching**: Use exact text matches where possible
- **Role-based Selectors**: Prefer `getByRole()` for buttons and headings
- **Fallback Strategies**: Multiple selector strategies for different UI implementations

## Environment Setup

### Required Environment Variables (.env)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Test Credentials
TEST_USER_EMAIL=eshagh@fennaver.com
TEST_USER_PASSWORD=Eshagh611
```

## Running Tests

### Prerequisites
1. Ensure the development server is running: `npm run dev`
2. Verify environment variables are set correctly
3. Check Supabase connection and database accessibility

### Commands

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/auth-flow.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npx playwright test --headed

# Generate HTML report
npx playwright show-report
```

## Known Issues and Solutions

### 1. Database Connection Errors
**Issue**: "Failed to fetch companies" toast notifications appear frequently
**Root Cause**: Supabase connectivity or authentication issues
**Impact**: UI remains functional, but data operations may fail
**Solution**: Check Supabase connection, verify service role keys, ensure database is accessible

### 2. Form Field Labels
**Issue**: `getByLabel()` selectors don't work reliably
**Root Cause**: Form labels may not be properly associated with inputs
**Solution**: Use `input[name="field_name"]` selectors instead

### 3. Multiple Element Matches
**Issue**: Selectors like `text=Internal Dashboard` match multiple elements
**Solution**: Use `.first()` or more specific selectors

## Test Strategy

### What We Test
✅ **Authentication Flow** - Login, logout, session management
✅ **Navigation** - Page routing and URL handling  
✅ **UI Components** - Dialogs, forms, buttons
✅ **Error Handling** - Database errors, validation, edge cases
✅ **Responsive Design** - Mobile viewport testing

### What We Don't Test (Yet)
❌ **Data Persistence** - Due to database connectivity issues
❌ **Complex CRUD Operations** - Requires stable database connection
❌ **File Uploads** - Not implemented in current UI
❌ **Email Functionality** - External service integration

## Future Improvements

1. **Fix Database Connectivity** - Resolve Supabase connection issues for full CRUD testing
2. **Visual Regression Testing** - Add screenshot comparisons
3. **Performance Testing** - Add loading time and performance metrics
4. **API Testing** - Direct API endpoint testing alongside UI tests
5. **Cross-browser Testing** - Expand beyond Chromium to Firefox and Safari
6. **Accessibility Testing** - Add a11y checks to ensure compliance

## Troubleshooting

### Common Issues

**Tests timeout during login**
- Check if development server is running on localhost:3000
- Verify TEST_USER_EMAIL and TEST_USER_PASSWORD are correct
- Ensure network connectivity

**"Failed to fetch" errors**
- Check Supabase service status
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check database permissions

**Selector not found errors**  
- Verify the UI hasn't changed
- Check if elements are properly loaded
- Use browser dev tools to inspect actual HTML structure

### Debug Mode
```bash
# Run with debug info
DEBUG=pw:api npx playwright test

# Run single test with trace
npx playwright test --trace on

# Open trace viewer
npx playwright show-trace trace.zip
```

## Contributing

When adding new tests:
1. Follow the established selector patterns (prefer `name` attributes)
2. Add proper error handling for database connectivity issues
3. Use appropriate timeouts for async operations
4. Include cleanup logic for any created test data
5. Document any new test patterns or workarounds