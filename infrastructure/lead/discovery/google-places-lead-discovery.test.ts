import {
  GooglePlacesLeadDiscovery,
  parseSearchResponse
} from '@/infrastructure/lead/discovery/google-places-lead-discovery';
import { DailyQuotaGuard } from '@/infrastructure/shared/daily-quota-guard';
import { InMemoryQuotaStore } from '@/infrastructure/shared/quota-store';

const placeResponse = {
  places: [
    {
      displayName: { text: 'Studio Dentistico Rossi' },
      formattedAddress: 'Via Dante 1, Milano MI 20121, Italia',
      nationalPhoneNumber: '+39 02 1234567',
      websiteUri: 'https://rossidentist.example',
      addressComponents: [
        { longText: 'Milano', shortText: 'Milano', types: ['locality'] }
      ],
      types: ['dentist', 'establishment', 'point_of_interest']
    }
  ]
};

describe('parseSearchResponse', () => {
  it('maps Google Places fields to DiscoveredLead', () => {
    expect(parseSearchResponse(placeResponse)).toEqual({
      places: [
        {
          companyName: 'Studio Dentistico Rossi',
          category: 'dentist',
          website: 'https://rossidentist.example',
          phone: '+39 02 1234567',
          email: undefined,
          address: 'Via Dante 1, Milano MI 20121, Italia',
          city: 'Milano'
        }
      ],
      nextPageToken: undefined
    });
  });

  it('extracts the city from the locality address component', () => {
    const response = {
      places: [
        {
          displayName: { text: 'Acme' },
          addressComponents: [
            {
              longText: 'Roma',
              shortText: 'RM',
              types: ['locality', 'political']
            }
          ]
        }
      ]
    };

    expect(parseSearchResponse(response).places[0].city).toBe('Roma');
  });

  it('returns an empty array when places is missing', () => {
    expect(parseSearchResponse({})).toEqual({ places: [] });
  });

  it('returns an empty array when places is not an array', () => {
    expect(parseSearchResponse({ places: 'nope' })).toEqual({ places: [] });
  });

  it('exposes the next page token when present', () => {
    expect(
      parseSearchResponse({ places: [], nextPageToken: 'token-abc' })
    ).toEqual({ places: [], nextPageToken: 'token-abc' });
  });
});

describe('GooglePlacesLeadDiscovery', () => {
  const input = {
    query: 'dentists',
    location: 'Milano',
    quantity: 5
  };

  it('calls Text Search with query and API key', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(placeResponse)
    });

    const discovery = new GooglePlacesLeadDiscovery({
      apiKey: 'test-key',
      fetchFn,
      endpoint: 'https://places.example/v1/places:searchText'
    });

    const results = await discovery.search(input);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      companyName: 'Studio Dentistico Rossi',
      website: 'https://rossidentist.example',
      phone: '+39 02 1234567',
      city: 'Milano'
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://places.example/v1/places:searchText');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Goog-Api-Key']).toBe('test-key');
    expect(init.headers['X-Goog-FieldMask']).toContain(
      'places.websiteUri'
    );
    expect(JSON.parse(init.body).textQuery).toBe('dentists Milano');
  });

  it('sends pageSize based on the requested quantity', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ places: [] })
    });

    const discovery = new GooglePlacesLeadDiscovery({ fetchFn });

    await discovery.search({ query: 'dentists', location: 'Milano', quantity: 12 });

    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(body.pageSize).toBe(12);
  });

  it('uses the default pageSize when quantity is not provided', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ places: [] })
    });

    const discovery = new GooglePlacesLeadDiscovery({ fetchFn });

    await discovery.search({ query: 'dentists', location: 'Milano' });

    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(body.pageSize).toBe(20);
  });

  it('raises a GooglePlacesDiscoveryError on non-ok status', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 403 });

    const discovery = new GooglePlacesLeadDiscovery({ fetchFn });

    await expect(discovery.search(input)).rejects.toThrow(
      'Google Places search failed with status 403'
    );
  });

  it('retries provider failures when configured', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(placeResponse)
      });

    const discovery = new GooglePlacesLeadDiscovery({
      fetchFn,
      maxRetries: 1
    });

    await expect(discovery.search(input)).resolves.toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('follows pagination tokens to collect more results', async () => {
    const page1 = {
      places: [
        {
          displayName: { text: 'Dentist 1' },
          addressComponents: [
            { longText: 'Milano', shortText: 'Milano', types: ['locality'] }
          ]
        }
      ],
      nextPageToken: 'page-2-token'
    };
    const page2 = {
      places: [
        {
          displayName: { text: 'Dentist 2' },
          addressComponents: [
            { longText: 'Milano', shortText: 'Milano', types: ['locality'] }
          ]
        }
      ]
    };

    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(page1) })
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(page2) });

    const discovery = new GooglePlacesLeadDiscovery({ fetchFn });

    const results = await discovery.search({
      query: 'dentists',
      location: 'Milano',
      quantity: 30
    });

    expect(results.map((r) => r.companyName)).toEqual(['Dentist 1', 'Dentist 2']);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const secondBody = JSON.parse(fetchFn.mock.calls[1][1].body);
    expect(secondBody.pageToken).toBe('page-2-token');
  });

  it('limits results to the requested quantity', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        places: [
          { displayName: { text: 'A' } },
          { displayName: { text: 'B' } },
          { displayName: { text: 'C' } }
        ]
      })
    });

    const discovery = new GooglePlacesLeadDiscovery({ fetchFn });

    const results = await discovery.search({
      query: 'dentists',
      location: 'Milano',
      quantity: 2
    });

    expect(results).toHaveLength(2);
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

    const discovery = new GooglePlacesLeadDiscovery({
      fetchFn,
      timeoutMs: 25,
      maxRetries: 0
    });

    const search = discovery.search(input);
    const expectation = expect(search).rejects.toThrow(
      'Google Places search timed out'
    );

    await jest.advanceTimersByTimeAsync(25);
    await expectation;

    jest.useRealTimers();
  });

  it('stops early without calling the network when quota is exhausted', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(placeResponse)
    });

    const quotaGuard = new DailyQuotaGuard({
      limits: { 'places-text-search': 1 },
      store: new InMemoryQuotaStore()
    });

    const discovery = new GooglePlacesLeadDiscovery({ fetchFn, quotaGuard });

    // First search consumes the only quota unit.
    await discovery.search(input);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Quota exhausted: second run must not hit the network and returns [].
    const results = await discovery.search(input);
    expect(results).toHaveLength(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('counts served calls toward the daily quota', async () => {
    const quotaGuard = new DailyQuotaGuard({
      limits: { 'places-text-search': 10 },
      store: new InMemoryQuotaStore()
    });
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(placeResponse)
    });

    const discovery = new GooglePlacesLeadDiscovery({ fetchFn, quotaGuard });
    await discovery.search(input);

    expect((await quotaGuard.usage('places-text-search')).used).toBe(1);
  });

  it('does not count failed requests toward the daily quota', async () => {
    const quotaGuard = new DailyQuotaGuard({
      limits: { 'places-text-search': 10 },
      store: new InMemoryQuotaStore()
    });
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 403 });

    const discovery = new GooglePlacesLeadDiscovery({ fetchFn, quotaGuard });

    await expect(discovery.search(input)).rejects.toThrow(
      'Google Places search failed with status 403'
    );
    expect((await quotaGuard.usage('places-text-search')).used).toBe(0);
  });

  it('does not count zero-result responses (SKU gratuito) toward the quota', async () => {
    const quotaGuard = new DailyQuotaGuard({
      limits: { 'places-text-search': 10 },
      store: new InMemoryQuotaStore()
    });
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ places: [] })
    });

    const discovery = new GooglePlacesLeadDiscovery({ fetchFn, quotaGuard });
    await discovery.search(input);

    expect((await quotaGuard.usage('places-text-search')).used).toBe(0);
  });
});
