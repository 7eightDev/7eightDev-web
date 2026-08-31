import type {
  PageSpeedInput,
  PageSpeedPort,
  PageSpeedResult
} from '@/domain/lead/lead.pagespeed';

describe('PageSpeedPort', () => {
  it('defines an analyze contract for PageSpeed analysis', async () => {
    const pageSpeed: PageSpeedPort = {
      async analyze(): Promise<PageSpeedResult> {
        throw new Error('Not implemented');
      }
    };

    const input: PageSpeedInput = {
      url: 'https://example.com',
      strategy: 'mobile'
    };

    await expect(pageSpeed.analyze(input)).rejects.toThrow('Not implemented');
  });
});
