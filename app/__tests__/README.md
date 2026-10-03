# Tests

This directory contains unit tests for the application.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Files

- `utils.test.ts` - Tests for utility functions (cn, parseOrigins, sanitize)
- `sanitize.test.ts` - XSS prevention and HTML sanitization tests
- `auth-utils.test.ts` - Email template and URL validation tests

## Writing Tests

Tests use Vitest with the following conventions:

1. **File naming**: `*.test.ts` or `*.test.tsx`
2. **Structure**: Use `describe` blocks for grouping, `it` for individual tests
3. **Assertions**: Use Vitest's `expect` API

Example:

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/utils/my-utils'

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

## Coverage

Coverage reports are generated in the `coverage/` directory. The project targets:

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%
