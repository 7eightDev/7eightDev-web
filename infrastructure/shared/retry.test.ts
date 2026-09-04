import { withRetry } from '@/infrastructure/shared/retry';

describe('withRetry', () => {
  it('returns the result on first success', async () => {
    const op = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(op, { maxRetries: 3 });
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const op = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const result = await withRetry(op, {
      maxRetries: 2,
      baseDelayMs: 1,
      maxDelayMs: 10,
    });
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const op = jest.fn().mockRejectedValue(new Error('always fails'));
    await expect(
      withRetry(op, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 })
    ).rejects.toThrow('always fails');
    expect(op).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry when isRetryable returns false', async () => {
    const op = jest.fn().mockRejectedValue(new Error('non-retryable'));
    await expect(
      withRetry(
        op,
        { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 },
        () => false
      )
    ).rejects.toThrow('non-retryable');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('respects maxRetries: 0 (no retries)', async () => {
    const op = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(
      withRetry(op, { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 10 })
    ).rejects.toThrow('fail');
    expect(op).toHaveBeenCalledTimes(1);
  });
});
