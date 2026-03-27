# Test Examples

## Good Tests

Good tests describe behavior through the public interface:

```typescript
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.addItem({ id: "shirt", quantity: 2, price: 25 });
  const result = await checkout(cart, validPayment);
  expect(result.status).toBe("confirmed");
  expect(result.total).toBe(50);
});
```

This test:
- Uses the public API (`createCart`, `addItem`, `checkout`)
- Asserts on observable outcomes (`status`, `total`)
- Reads like a specification
- Would survive any internal refactor

## Bad Tests

Bad tests are coupled to implementation:

```typescript
test("checkout calls payment gateway", async () => {
  const mockGateway = jest.fn().mockResolvedValue({ ok: true });
  const cart = new Cart();
  cart._items = [{ id: "shirt", qty: 2 }]; // accessing internals
  await cart._processCheckout(mockGateway); // testing private method
  expect(mockGateway).toHaveBeenCalledWith(/* specific internal format */);
});
```

Red flags:
- Accesses private/internal state (`_items`, `_processCheckout`)
- Mocks an internal collaborator
- Asserts on *how* it works, not *what* it produces
- Will break if internals change, even if behavior is identical
