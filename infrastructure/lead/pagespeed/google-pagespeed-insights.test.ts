import { PageSpeedAnalysisError } from '@/domain/lead/lead.pagespeed';
import {
  GooglePageSpeedInsights,
  parsePageSpeedResponse
} from '@/infrastructure/lead/pagespeed/google-pagespeed-insights';

const successfulPageSpeedResponse = {
  lighthouseResult: {
    categories: {
      performance: {
        score: 0.49
      }
    },
    audits: {
      'largest-contentful-paint': {
        numericValue: 2450.2
      },
      'first-contentful-paint': {
        numericValue: 1100
      },
      'cumulative-layout-shift': {
        numericValue: 0.08
      },
      'total-blocking-time': {
        numericValue: 320
      }
    }
  }
};

describe('parsePageSpeedResponse', () => {
  it('maps Lighthouse performance and core metrics', () => {
    expect(parsePageSpeedResponse(successfulPageSpeedResponse)).toEqual({
      performanceScore: 49,
      lcp: 2450.2,
      fcp: 1100,
      cls: 0.08,
      tbt: 320
    });
  });

  it('returns null metrics when the response is incomplete', () => {
    expect(parsePageSpeedResponse({ lighthouseResult: {} })).toEqual({
      performanceScore: null,
      lcp: null,
      fcp: null,
      cls: null,
      tbt: null
    });
  });
});

describe('GooglePageSpeedInsights', () => {
  it('calls Google PageSpeed Insights with mobile strategy and API key', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(successfulPageSpeedResponse)
    });

    const pageSpeed = new GooglePageSpeedInsights({
      apiKey: 'test-key',
      fetchFn,
      endpoint: 'https://pagespeed.example/run'
    });

    await expect(
      pageSpeed.analyze({
        url: 'https://example.com',
        strategy: 'mobile'
      })
    ).resolves.toEqual({
      performanceScore: 49,
      lcp: 2450.2,
      fcp: 1100,
      cls: 0.08,
      tbt: 320
    });

    const calledUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      'https://pagespeed.example/run'
    );
    expect(calledUrl.searchParams.get('url')).toBe('https://example.com/');
    expect(calledUrl.searchParams.get('strategy')).toBe('mobile');
    expect(calledUrl.searchParams.get('key')).toBe('test-key');
  });

  it('rejects invalid input URLs before calling the provider', async () => {
    const fetchFn = jest.fn();
    const pageSpeed = new GooglePageSpeedInsights({ fetchFn });

    await expect(
      pageSpeed.analyze({
        url: 'mailto:info@example.com',
        strategy: 'mobile'
      })
    ).rejects.toThrow(PageSpeedAnalysisError);

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('raises a PageSpeedAnalysisError when Google returns an error status', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 429
    });

    const pageSpeed = new GooglePageSpeedInsights({ fetchFn });

    await expect(
      pageSpeed.analyze({
        url: 'https://example.com',
        strategy: 'mobile'
      })
    ).rejects.toThrow('PageSpeed request failed with status 429');
  });

  it('retries provider failures when configured', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(successfulPageSpeedResponse)
      });

    const pageSpeed = new GooglePageSpeedInsights({
      fetchFn,
      maxRetries: 1
    });

    await expect(
      pageSpeed.analyze({
        url: 'https://example.com',
        strategy: 'mobile'
      })
    ).resolves.toMatchObject({
      performanceScore: 49
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('aborts requests after the configured timeout', async () => {
    jest.useFakeTimers();

    const fetchFn = jest.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );

    const pageSpeed = new GooglePageSpeedInsights({
      fetchFn,
      timeoutMs: 25
    });

    const analysis = pageSpeed.analyze({
      url: 'https://example.com',
      strategy: 'mobile'
    });
    const expectation = expect(analysis).rejects.toThrow(
      'PageSpeed request timed out'
    );

    await jest.advanceTimersByTimeAsync(25);
    await expectation;

    jest.useRealTimers();
  });
});
