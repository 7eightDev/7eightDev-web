import {
  add,
  equals,
  formatMoney,
  min,
  money,
  moneyFromUnits,
  multiply,
  subtract,
  sum,
  vatOf,
  zero
} from '@/domain/shared/money';

describe('Money value object', () => {
  it('rejects non-integer cents', () => {
    expect(() => money(10.5)).toThrow(/integer cents/);
  });

  it('creates from whole units', () => {
    expect(moneyFromUnits(1500).amountCents).toBe(150_000);
  });

  it('adds amounts of the same currency', () => {
    expect(add(money(1000), money(250)).amountCents).toBe(1250);
  });

  it('refuses to add different currencies', () => {
    expect(() => add(money(100, 'EUR'), money(100, 'USD'))).toThrow(
      /Currency mismatch/
    );
  });

  it('sums a list, with zero identity', () => {
    expect(sum([]).amountCents).toBe(0);
    expect(sum([money(100), money(200), money(300)]).amountCents).toBe(600);
  });

  it('subtracts amounts of the same currency', () => {
    expect(subtract(money(1000), money(250)).amountCents).toBe(750);
    expect(() => subtract(money(100, 'EUR'), money(50, 'USD'))).toThrow(
      /Currency mismatch/
    );
  });

  it('returns the smaller amount with min', () => {
    expect(min(money(900), money(1500)).amountCents).toBe(900);
    expect(min(money(1500), money(900)).amountCents).toBe(900);
  });

  it('multiplies with rounding to integer cents', () => {
    // 333 * 0.22 = 73.26 → 73
    expect(multiply(money(333), 0.22).amountCents).toBe(73);
  });

  it('computes VAT without floating point drift', () => {
    // 1999.99 € net @22% → 439.9978 € → 440.00 € (43_998 cents → 44_000? no:)
    // 199_999 * 0.22 = 43_999.78 → 44_000 cents
    expect(vatOf(money(199_999), 0.22).amountCents).toBe(44_000);
  });

  it('compares by value', () => {
    expect(equals(money(100), money(100))).toBe(true);
    expect(equals(money(100), money(100, 'USD'))).toBe(false);
    expect(equals(zero(), money(0))).toBe(true);
  });

  it('formats with currency symbol and correct digits', () => {
    // Locale separators vary by ICU build; assert digits + symbol only.
    const formatted = formatMoney(moneyFromUnits(1500));
    expect(formatted.replace(/[^\d]/g, '')).toBe('1500');
    expect(formatted).toContain('€');
    expect(formatMoney(moneyFromUnits(99.5)).replace(/[^\d]/g, '')).toBe(
      '9950'
    );
  });
});
