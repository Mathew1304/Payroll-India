# 🔒 Secure Logging - Quick Reference

## ⚡ Quick Start

```typescript
// 1. Import
import { secureLog } from '../utils/secureLogger';

// 2. Use instead of console
secureLog.info('Message', data);    // instead of console.log
secureLog.error('Error', error);    // instead of console.error
secureLog.warn('Warning', warning); // instead of console.warn
```

## 📋 Cheat Sheet

| ❌ Don't Use | ✅ Use Instead | When |
|-------------|----------------|------|
| `console.log()` | `secureLog.info()` | General information |
| `console.error()` | `secureLog.error()` | Errors |
| `console.warn()` | `secureLog.warn()` | Warnings |
| `console.debug()` | `secureLog.debug()` | Debugging |
| `console.table()` | `secureLog.table()` | Tables |
| `console.group()` | `secureLog.group()` | Grouped logs |

## 🎯 Common Patterns

### Basic Logging
```typescript
secureLog.info('User logged in');
secureLog.success('Data saved successfully');
secureLog.error('Failed to load data');
```

### Logging Objects (Auto-Sanitized)
```typescript
// IDs, emails, etc. are automatically redacted
secureLog.info('User data:', user);
secureLog.debug('Query result:', data);
```

### Grouped Logs
```typescript
secureLog.group('Login Process');
secureLog.info('Step 1: Validate');
secureLog.info('Step 2: Authenticate');
secureLog.groupEnd();
```

### Development Only
```typescript
// Only shows in development, never in production
secureLog.devOnly('Debug info:', debugData);
```

## 🔐 What Gets Redacted?

All these fields are automatically replaced with `[REDACTED]`:

- **IDs**: `id`, `uuid`, `user_id`, `employee_id`, `organization_id`
- **Auth**: `password`, `token`, `access_token`, `api_key`, `secret`
- **PII**: `email`, `phone`, `address`, `ssn`
- **Finance**: `salary`, `wage`, `credit_card`, `bank_account`

## 🌍 Environment Behavior

| Environment | Info/Debug/Warn | Errors | Data |
|-------------|----------------|--------|------|
| **Development** | ✅ Shown | ✅ Shown | 🔒 Sanitized |
| **Production** | ❌ Hidden | ✅ Shown | 🔒 Sanitized |

## 🛠️ Useful Commands

```bash
# Find all console usage in codebase
npm run find-console

# Run in development (logs enabled)
npm run dev

# Build for production (strips console)
npm run build

# Preview production build (no console)
npm run preview
```

## ⚠️ Important Rules

1. **NEVER** use `console.*` directly
2. **ALWAYS** import and use `secureLog`
3. **DON'T** log raw API responses
4. **DON'T** log authentication tokens
5. **DO** use appropriate log levels

## 💡 Pro Tips

```typescript
// ✅ Good: Descriptive messages
secureLog.info('Loading employees for payroll');

// ❌ Bad: No context
secureLog.info(data);

// ✅ Good: Use appropriate level
secureLog.error('Failed to save', error);

// ❌ Bad: Wrong level
secureLog.info('Critical error occurred');

// ✅ Good: Group related logs
secureLog.group('Payroll Processing');
// ... multiple logs
secureLog.groupEnd();

// ❌ Bad: Ungrouped spam
secureLog.info('Step 1');
secureLog.info('Step 2');
secureLog.info('Step 3');
```

## 🚨 Emergency: Disable Sanitization

**⚠️ Only in development, only for debugging!**

```typescript
import { secureLog } from '../utils/secureLog';

// Temporarily disable (use with extreme caution!)
secureLog.setSanitization(false);

// Your debugging here
secureLog.info('Unsanitized data:', data);

// Re-enable immediately
secureLog.setSanitization(true);
```

## 📚 Full Documentation

- **Usage Guide**: `docs/SECURE_LOGGING.md`
- **Security Details**: `docs/SECURITY_CONSOLE.md`
- **Implementation**: `docs/IMPLEMENTATION_SUMMARY.md`

---

**Remember**: The console is public. Never log sensitive data! 🔒
