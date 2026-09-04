import { startLeadGenerationSchema, leadIdSchema, websiteUrlSchema } from '@/application/lead/lead.schemas';

describe('Lead input validation edge cases', () => {
  describe('startLeadGenerationSchema', () => {
    it('rejects empty query', () => {
      const result = startLeadGenerationSchema.safeParse({ query: '', location: 'Milano' });
      expect(result.success).toBe(false);
    });

    it('rejects query exceeding 200 chars', () => {
      const result = startLeadGenerationSchema.safeParse({
        query: 'a'.repeat(201),
        location: 'Milano',
      });
      expect(result.success).toBe(false);
    });

    it('rejects location exceeding 200 chars', () => {
      const result = startLeadGenerationSchema.safeParse({
        query: 'dentisti',
        location: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('rejects quantity > 100', () => {
      const result = startLeadGenerationSchema.safeParse({
        query: 'dentisti',
        location: 'Milano',
        quantity: 101,
      });
      expect(result.success).toBe(false);
    });

    it('rejects quantity < 1', () => {
      const result = startLeadGenerationSchema.safeParse({
        query: 'dentisti',
        location: 'Milano',
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer quantity', () => {
      const result = startLeadGenerationSchema.safeParse({
        query: 'dentisti',
        location: 'Milano',
        quantity: 5.5,
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid input without quantity', () => {
      const result = startLeadGenerationSchema.safeParse({
        query: 'dentisti',
        location: 'Milano',
      });
      expect(result.success).toBe(true);
    });

    it('accepts quantity at boundary (100)', () => {
      const result = startLeadGenerationSchema.safeParse({
        query: 'dentisti',
        location: 'Milano',
        quantity: 100,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('leadIdSchema', () => {
    it('rejects non-UUID strings', () => {
      expect(leadIdSchema.safeParse('not-a-uuid').success).toBe(false);
      expect(leadIdSchema.safeParse('').success).toBe(false);
      expect(leadIdSchema.safeParse('123').success).toBe(false);
    });

    it('accepts valid UUIDs', () => {
      expect(leadIdSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    });
  });

  describe('websiteUrlSchema', () => {
    it('accepts valid https URLs', () => {
      expect(websiteUrlSchema.safeParse('https://example.com').success).toBe(true);
    });

    it('accepts valid http URLs', () => {
      expect(websiteUrlSchema.safeParse('http://example.com').success).toBe(true);
    });

    it('rejects ftp URLs', () => {
      expect(websiteUrlSchema.safeParse('ftp://example.com').success).toBe(false);
    });

    it('rejects malformed URLs', () => {
      expect(websiteUrlSchema.safeParse('not-a-url').success).toBe(false);
    });

    it('accepts undefined (optional)', () => {
      expect(websiteUrlSchema.safeParse(undefined).success).toBe(true);
    });

    it('rejects URLs exceeding 2048 chars', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048);
      expect(websiteUrlSchema.safeParse(longUrl).success).toBe(false);
    });
  });
});
