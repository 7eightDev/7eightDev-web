import { HtmlCopyrightDetector } from '@/infrastructure/lead/copyright/html-copyright-detector';

function okResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html' }
  });
}

describe('HtmlCopyrightDetector', () => {
  it('extracts the copyright line from the footer', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        '<html><body><header>Intestazione</header>' +
          '<footer>© 2019 Studio Rossi – P.IVA 01234567890</footer></body></html>'
      )
    );
    const detector = new HtmlCopyrightDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toBe(
      '© 2019 Studio Rossi – P.IVA 01234567890'
    );
  });

  it('picks the last copyright on the page (the footer)', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        '<body><p>© 2010 vecchio</p>' +
          '<footer>Copyright &copy; 2024 Nuova Studio</footer></body>'
      )
    );
    const detector = new HtmlCopyrightDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toBe(
      'Copyright © 2024 Nuova Studio'
    );
  });

  it('decodes HTML entities and strips tags', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse('<footer><strong>&copy; 2021 Rossi &amp; Bianchi Srl</strong></footer>')
    );
    const detector = new HtmlCopyrightDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toBe(
      '© 2021 Rossi & Bianchi Srl'
    );
  });

  it('returns undefined when no copyright text is present', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse('<html><body><footer>Solo un footer senza anno</footer></body></html>')
    );
    const detector = new HtmlCopyrightDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toBeUndefined();
  });

  it('ignores JS/CSS payloads that merely contain the word copyright', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        '<script>{"props":{"copyright":"© 2019"}}</script>' +
          '<style>:root{--copyright-year:2019;}</style>' +
          '<footer>© 2023 Vero Sito</footer>'
      )
    );
    const detector = new HtmlCopyrightDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toBe(
      '© 2023 Vero Sito'
    );
  });

  it('skips bundled lines that are too long to be a footer', async () => {
    const longCss = '.a{color:#fff;}'.repeat(200);
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        `<style>/* Copyright (c) 2015 */ ${longCss}</style>` +
          '<footer>&copy; 2022 Studio Roma</footer>'
      )
    );
    const detector = new HtmlCopyrightDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toBe(
      '© 2022 Studio Roma'
    );
  });

  it('cuts the value from the copyright marker, dropping wrappers', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse('<footer>footer-menu © 2019 Studio Rossi</footer>')
    );
    const detector = new HtmlCopyrightDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toBe(
      '© 2019 Studio Rossi'
    );
  });

  it('keeps footers with html entities (em-dash, P. IVA) as a readable value', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse(
        '<footer>&copy; 2024 Ottica De Ruiz &#8211; P. IVA 04/22</footer>'
      )
    );
    const detector = new HtmlCopyrightDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toBe(
      '© 2024 Ottica De Ruiz – P. IVA 04/22'
    );
  });

  it('returns undefined when the page is unreachable', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValue(new Error('network down'));
    const detector = new HtmlCopyrightDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toBeUndefined();
  });

  it('follows redirects up to the limit while scanning for copyright', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: '/home' }
        })
      )
      .mockResolvedValueOnce(okResponse('<footer>© 2023 Reindirizzata</footer>'));
    const detector = new HtmlCopyrightDetector({ fetchFn });

    await expect(detector.detect('https://site.it')).resolves.toBe(
      '© 2023 Reindirizzata'
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      'https://site.it/home',
      expect.objectContaining({ redirect: 'manual' })
    );
  });

  it('detects a copyright matching the criterion case-insensitively via the pipeline', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      okResponse('<footer>© 2019 Fiera Del Mobile</footer>')
    );
    const detector = new HtmlCopyrightDetector({ fetchFn });

    const detected = await detector.detect('https://site.it');
    expect(detected).toBeDefined();
    expect(detected!.toLowerCase()).toContain('© 2019');
  });
});