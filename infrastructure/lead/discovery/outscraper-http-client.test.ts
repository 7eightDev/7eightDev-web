import {
  OutscraperHttpClient,
  parseOutscraperResponse
} from '@/infrastructure/lead/discovery/outscraper-http-client';

const successfulResponse = {
  data: [
    {
      name: 'Acme Web',
      type: 'Web agency',
      site: 'https://acme.example',
      phone: '+39 049 1234567',
      full_address: 'Via Roma 1, Padova',
      city: 'Padova'
    }
  ]
};

describe('parseOutscraperResponse', () => {
  it('maps Outscraper places to normalized results', () => {
    expect(parseOutscraperResponse(successfulResponse)).toEqual([
      {
        name: 'Acme Web',
        category: 'Web agency',
        website: 'https://acme.example',
        phone: '+39 049 1234567',
        email: undefined,
        address: 'Via Roma 1, Padova',
        city: 'Padova'
      }
    ]);
  });

  it('prefers category over type when both are present', () => {
    expect(
      parseOutscraperResponse({
        data: [{ name: 'Acme', category: 'Cat A', type: 'Cat B' }]
      })
    ).toEqual([
      {
        name: 'Acme',
        category: 'Cat A',
        website: undefined,
        phone: undefined,
        email: undefined,
        address: undefined,
        city: undefined
      }
    ]);
  });

  it('returns an empty array when data is missing', () => {
    expect(parseOutscraperResponse({})).toEqual([]);
  });

  it('returns an empty array when data is not an array', () => {
    expect(parseOutscraperResponse({ data: 'nope' })).toEqual([]);
  });
});

describe('OutscraperHttpClient', () => {
  const input = {
    query: 'web agencies',
    location: 'Padova',
    quantity: 5
  };

  it('calls the Outscraper search endpoint with query and limit', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(successfulResponse)
    });

    const client = new OutscraperHttpClient({
      apiKey: 'test-key',
      fetchFn,
      endpoint: 'https://outscraper.example/maps/search-v3'
    });

    await expect(client.search(input)).resolves.toEqual([
      {
        name: 'Acme Web',
        category: 'Web agency',
        website: 'https://acme.example',
        phone: '+39 049 1234567',
        email: undefined,
        address: 'Via Roma 1, Padova',
        city: 'Padova'
      }
    ]);

    const calledUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      'https://outscraper.example/maps/search-v3'
    );
    expect(calledUrl.searchParams.get('query')).toBe('web agencies Padova');
    expect(calledUrl.searchParams.get('limit')).toBe('5');
  });

  it('uses the default limit when quantity is not provided', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] })
    });

    const client = new OutscraperHttpClient({ fetchFn });

    await client.search({ query: 'dentists', location: 'Milano' });

    const calledUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(calledUrl.searchParams.get('limit')).toBe('20');
  });

  it('authenticates with the X-API-KEY header', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] })
    });

    const client = new OutscraperHttpClient({ apiKey: 'secret', fetchFn });

    await client.search(input);

    const headers = fetchFn.mock.calls[0][1].headers;
    expect(headers['X-API-KEY']).toBe('secret');
  });

  it('raises an OutscraperDiscoveryError on non-ok status', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 402
    });

    const client = new OutscraperHttpClient({ fetchFn });

    await expect(client.search(input)).rejects.toThrow(
      'Outscraper search failed with status 402'
    );
  });

  it('retries provider failures when configured', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(successfulResponse)
      });

    const client = new OutscraperHttpClient({ fetchFn, maxRetries: 1 });

    await expect(client.search(input)).resolves.toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('returns an empty array when the provider returns an empty result', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] })
    });

    const client = new OutscraperHttpClient({ fetchFn });

    await expect(client.search(input)).resolves.toEqual([]);
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

    const client = new OutscraperHttpClient({ fetchFn, timeoutMs: 25 });

    const search = client.search(input);
    const expectation = expect(search).rejects.toThrow(
      'Outscraper search timed out'
    );

    await jest.advanceTimersByTimeAsync(25);
    await expectation;

    jest.useRealTimers();
  });
});
