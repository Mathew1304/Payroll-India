# Secure Logging Guide

## Overview

This application uses a **Secure Logger** utility to prevent sensitive data from being exposed in the browser's developer console. This is critical for protecting user privacy and preventing data theft.

## What Gets Sanitized?

The secure logger automatically redacts the following sensitive information:

### Identifiers
- `id`, `uuid`
- `user_id`, `employee_id`, `organization_id`
- `department_id`, `company_id`, `auth_id`
- `created_by`, `updated_by`, `reviewer_id`, `manager_id`

### Authentication & Security
- `password`, `token`
- `access_token`, `refresh_token`
- `api_key`, `secret`, `private_key`

### Personal Information
- `email`, `phone`, `mobile`
- `address`
- `ssn`, `social_security`

### Financial Information
- `salary`, `wage`, `compensation`
- `credit_card`, `bank_account`
- `iban`, `swift`

## Usage

### Basic Logging

Replace standard console methods with secure logger:

```typescript
import { secureLog } from '../utils/secureLogger';

// Instead of: console.log('User data:', user);
secureLog.info('User data:', user);

// Instead of: console.error('Error:', error);
secureLog.error('Error:', error);

// Instead of: console.warn('Warning:', warning);
secureLog.warn('Warning:', warning);
```

### Log Levels

```typescript
// Info - General information (disabled in production)
secureLog.info('Loading employees...');

// Debug - Detailed debugging (only in development)
secureLog.debug('Query params:', params);

// Warning - Warnings (disabled in production)
secureLog.warn('Deprecated function used');

// Error - Errors (always logged, but sanitized in production)
secureLog.error('Failed to fetch data:', error);

// Success - Success messages (disabled in production)
secureLog.success('Data saved successfully');

// Dev Only - Only shows in development
secureLog.devOnly('Development-only debug info:', data);
```

### Grouped Logs

```typescript
secureLog.group('User Login Process');
secureLog.info('Step 1: Validating credentials');
secureLog.info('Step 2: Fetching user profile');
secureLog.info('Step 3: Loading organization data');
secureLog.groupEnd();

// Collapsed group
secureLog.group('Detailed Query Results', true);
secureLog.debug('Query:', query);
secureLog.debug('Results:', results);
secureLog.groupEnd();
```

### Table Logging

```typescript
// Automatically sanitizes table data
secureLog.table(employees);
```

## Example: Before and After

### ❌ Before (Insecure)

```typescript
console.log('Loading employees for organization:', organization.id);
console.log('Employee data:', {
  id: 'emp-123',
  email: 'john@example.com',
  salary: 50000,
  organization_id: 'org-456'
});
```

**Console Output:**
```
Loading employees for organization: org-456
Employee data: {
  id: 'emp-123',
  email: 'john@example.com',
  salary: 50000,
  organization_id: 'org-456'
}
```

### ✅ After (Secure)

```typescript
secureLog.info('Loading employees for organization:', organization.id);
secureLog.info('Employee data:', {
  id: 'emp-123',
  email: 'john@example.com',
  salary: 50000,
  organization_id: 'org-456'
});
```

**Console Output (Development):**
```
[INFO] Loading employees for organization: [REDACTED]
[INFO] Employee data: {
  id: '[REDACTED]',
  email: '[REDACTED]',
  salary: '[REDACTED]',
  organization_id: '[REDACTED]'
}
```

**Console Output (Production):**
```
(No output - logging disabled in production except for errors)
```

## Environment Behavior

### Development Mode (`npm run dev`)
- ✅ All log levels are shown
- ✅ Sensitive data is sanitized
- ✅ Colored, formatted output
- ✅ Full stack traces

### Production Mode (`npm run build`)
- ❌ Info, debug, warn, success logs are **disabled**
- ✅ Error logs are **enabled** but **sanitized**
- ✅ No sensitive data exposed
- ✅ Minimal console output

## Migration Guide

### Finding Console Statements

Search your codebase for:
- `console.log`
- `console.error`
- `console.warn`
- `console.debug`
- `console.info`

### Replacing Console Statements

1. Import the secure logger:
```typescript
import { secureLog } from '../utils/secureLogger';
```

2. Replace console methods:
```typescript
// Before
console.log('Message', data);

// After
secureLog.info('Message', data);
```

3. Choose appropriate log level:
   - `console.log` → `secureLog.info` or `secureLog.debug`
   - `console.error` → `secureLog.error`
   - `console.warn` → `secureLog.warn`
   - `console.debug` → `secureLog.debug`

## Advanced Usage

### Custom Sanitization

If you need to sanitize data manually:

```typescript
import { sanitizeData } from '../utils/secureLogger';

const sanitized = sanitizeData(userData);
// Now safe to send to external service
```

### Adding More Sensitive Keys

Edit `src/utils/secureLogger.ts` and add to the `SENSITIVE_KEYS` array:

```typescript
const SENSITIVE_KEYS = [
  // ... existing keys
  'custom_sensitive_field',
  'another_secret_field',
];
```

### Temporarily Disable Sanitization (Development Only)

```typescript
import { secureLog } from '../utils/secureLogger';

// Disable sanitization (use with caution!)
secureLog.setSanitization(false);

// Your logging here
secureLog.info('Unsanitized data:', data);

// Re-enable sanitization
secureLog.setSanitization(true);
```

## Best Practices

1. **Always use secureLog** instead of console methods
2. **Never log** raw API responses without sanitization
3. **Never log** authentication tokens or passwords
4. **Use appropriate log levels** - don't use `error` for info messages
5. **Group related logs** for better organization
6. **Test in production mode** to ensure no sensitive data leaks

## Security Checklist

- [ ] All `console.log` replaced with `secureLog.info`
- [ ] All `console.error` replaced with `secureLog.error`
- [ ] All `console.warn` replaced with `secureLog.warn`
- [ ] No direct logging of user objects
- [ ] No direct logging of database responses
- [ ] No logging of authentication tokens
- [ ] Tested in production build
- [ ] Verified no sensitive data in console

## Support

If you encounter any issues or need to add more sensitive fields to the sanitization list, please contact the development team.

---

**Remember:** The developer console is accessible to anyone using the application. Never log sensitive information, even in development mode!
