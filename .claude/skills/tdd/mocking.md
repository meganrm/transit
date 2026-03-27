# Mocking Guidelines

## When to Mock

Mock only at system boundaries — things you don't own or can't run in tests:

- **External APIs** (Stripe, Twilio, third-party services)
- **Network calls** to services outside your test environment
- **System resources** (filesystem in CI, hardware interfaces)

## When NOT to Mock

Never mock internal collaborators:

- Your own modules, classes, or functions
- Database access (use a test database or in-memory alternative)
- Internal services within the same codebase

If you feel the need to mock an internal module, that's a signal the interface boundary is wrong — consider deepening the module instead.

## The Rule

> If you wrote it, don't mock it. Test through it.

Mocking internal code creates tests that pass when behavior is broken and fail when behavior is fine. The mock becomes a parallel implementation that drifts from reality.
