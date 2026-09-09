import { HtmlAdsDetector } from '@/infrastructure/lead/ads/html-ads-detector';
import type { AdsDetectionResult } from '@/domain/lead/lead.ads';

const NO_ADS: AdsDetectionResult = {
  hasGoogleAds: false,
  hasMetaPixel: false,
  hasGtm: false
};

function htmlWith(body: string): string {
  return `<!doctype html><html><head><title>Prova</title></head><body>${body}</body></html>`;
}

function okResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html' }
  });
}

describe('HtmlAdsDetector', () => {
  it('detects Google Ads from a Google Ads gtag snippet', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        htmlWith(
          '<script async src="https://www.googletagmanager.com/gtag/js?id=AW-123456789"></script>'
        )
      )
    );
    const detector = new HtmlAdsDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toEqual({
      ...NO_ADS,
      hasGoogleAds: true
    });
  });

  it('detects the Meta Pixel from the fbevents script', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        htmlWith(
          '<script src="https://connect.facebook.net/en_US/fbevents.js"></script>'
        )
      )
    );
    const detector = new HtmlAdsDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toEqual({
      ...NO_ADS,
      hasMetaPixel: true
    });
  });

  it('detects Google Tag Manager from the GTM container snippet', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        htmlWith(
          '<script src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"></script>'
        )
      )
    );
    const detector = new HtmlAdsDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toEqual({
      ...NO_ADS,
      hasGtm: true
    });
  });

  it('detects several trackers in the same page', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        htmlWith(
          '<script async src="https://www.googletagmanager.com/gtag/js?id=AW-123456789"></script>' +
            '<script src="https://connect.facebook.net/en_US/fbevents.js"></script>' +
            '<script src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"></script>'
        )
      )
    );
    const detector = new HtmlAdsDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toEqual({
      hasGoogleAds: true,
      hasMetaPixel: true,
      hasGtm: true
    });
  });

  it('returns all-false when nothing recognizable is present', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(htmlWith('<p>Salve mondo</p>'))
    );
    const detector = new HtmlAdsDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toEqual(NO_ADS);
  });

  it('is case-insensitive against the marker list', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        htmlWith(
          '<SCRIPT src="https://CONNECT.FACEBOOK.NET/en_US/fbevents.js"></SCRIPT>'
        )
      )
    );
    const detector = new HtmlAdsDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toEqual({
      ...NO_ADS,
      hasMetaPixel: true
    });
  });

  it('never throws when the site is unreachable', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValue(new Error('network down'));
    const detector = new HtmlAdsDetector({ fetchFn });

    await expect(detector.detect('https://unreachable.it')).resolves.toEqual(
      NO_ADS
    );
  });

  it('returns all-false on non-OK responses', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 }));
    const detector = new HtmlAdsDetector({ fetchFn });

    await expect(detector.detect('https://broken.it')).resolves.toEqual(
      NO_ADS
    );
  });
});