import { HtmlTechDetector } from '@/infrastructure/lead/tech-stack/html-tech-detector';

function htmlWith(body: string): string {
  return `<!doctype html><html><head><title>Prova</title></head><body>${body}</body></html>`;
}

function okResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html' }
  });
}

describe('HtmlTechDetector', () => {
  it('detects WordPress from wp-content assets', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(htmlWith('<img src="https://site.it/wp-content/uploads/a.png">'))
    );
    const detector = new HtmlTechDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toContain(
      'WordPress'
    );
  });

  it('detects Wix and jQuery together from static assets', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        htmlWith(
          '<script src="https://static.parastorage.com/libs/jquery.min.js"></script>'
        )
      )
    );
    const detector = new HtmlTechDetector({ fetchFn });

    const result = await detector.detect('https://site.wixsite.com/ita');

    expect(result).toEqual(
      expect.arrayContaining(['Wix', 'jQuery'])
    );
  });

  it('reports React alongside Next.js markers', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        htmlWith(
          '<link rel="preload" href="/_next/static/chunks/react-framework.js"><script id="__NEXT_DATA__">{}</script>'
        )
      )
    );
    const detector = new HtmlTechDetector({ fetchFn });

    const result = await detector.detect('https://site.it');

    expect(result).toEqual(expect.arrayContaining(['React', 'Next.js']));
  });

  it('returns an empty array when nothing recognizable is present', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(htmlWith('<p>Salve mondo</p>'))
    );
    const detector = new HtmlTechDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toEqual([]);
  });

  it('does not throw when the site is unreachable', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValue(new Error('network down'));
    const detector = new HtmlTechDetector({ fetchFn });

    await expect(detector.detect('https://unreachable.it')).resolves.toEqual([]);
  });

  it('returns null-ish behaviour on non-OK responses (empty array)', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 }));
    const detector = new HtmlTechDetector({ fetchFn });

    await expect(detector.detect('https://broken.it')).resolves.toEqual([]);
  });
});