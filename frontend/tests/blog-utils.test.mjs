import test from 'node:test';
import assert from 'node:assert/strict';
import {
  additionalPostMedia,
  mediaUploadError,
  safeBlogReturn,
  validBlogLink,
  blogDate,
  blogPlainText,
  accessibleBlogHtml,
} from '../src/lib/blog-utils.ts';

test('image keyboard controls persist in rendered HTML without changing presentation attributes', () => {
  const html =
    '<p>Recuerdo</p><img src="https://example.com/x.jpg" alt="Playa &quot;Azul&quot;" data-size="small" data-align="right" />';
  const accessible = accessibleBlogHtml(html);
  assert.match(accessible, /role="button" tabindex="0" loading="lazy"/);
  assert.match(
    accessible,
    /aria-label="Ampliar imagen: Playa &quot;Azul&quot;"/,
  );
  assert.match(accessible, /data-size="small" data-align="right"/);
  assert.match(
    accessibleBlogHtml('<img src="x">'),
    /Ampliar imagen: Foto del blog/,
  );
  assert.equal(
    (accessibleBlogHtml(accessible).match(/role="button"/g) ?? []).length,
    1,
  );
});

test('gallery excludes cover and embedded image/video but keeps additional media', () => {
  const media = ['cover', 'inline?a=1&b=2', 'video', 'extra'].map(
    (url, id) => ({ id, url }),
  );
  assert.deepEqual(
    additionalPostMedia({
      featured_image: 'cover',
      media,
      body: '<img alt="X" src="inline?a=1&amp;b=2"><video controls src="video"></video>',
    }).map((m) => m.url),
    ['extra'],
  );
});
test('upload boundaries accept supported files and reject oversized or unsupported files', () => {
  assert.equal(
    mediaUploadError({ type: 'image/jpeg', size: 10 * 1024 * 1024 }, 19),
    null,
  );
  assert.ok(
    mediaUploadError({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }, 0),
  );
  assert.equal(
    mediaUploadError({ type: 'video/mp4', size: 150 * 1024 * 1024 }, 0),
    null,
  );
  assert.ok(
    mediaUploadError({ type: 'video/mp4', size: 150 * 1024 * 1024 + 1 }, 0),
  );
  assert.ok(mediaUploadError({ type: 'image/svg+xml', size: 1 }, 0));
  assert.ok(mediaUploadError({ type: 'image/png', size: 1 }, 20));
});
test('links reject active-content schemes and preserve valid links', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///secret',
    'invalid',
  ])
    assert.equal(validBlogLink(value), null);
  assert.equal(
    validBlogLink('https://example.com/story'),
    'https://example.com/story',
  );
  assert.equal(
    validBlogLink('mailto:hello@example.com'),
    'mailto:hello@example.com',
  );
});
test('back link keeps blog filters without allowing external or private redirects', () => {
  assert.equal(
    safeBlogReturn('/blog?page=3&tag=playa'),
    '/blog?page=3&tag=playa',
  );
  for (const value of [
    '//evil.test',
    'https://evil.test/blog',
    '/admin/blog',
    null,
  ])
    assert.equal(safeBlogReturn(value), '/blog');
});
test('date-only visits do not drift to a different day and blank markup stays blank', () => {
  assert.match(blogDate('2026-09-09'), /9/);
  assert.equal(blogPlainText('<p>&nbsp; &#160; &#xA0; \u200B</p>'), '');
});

test('gallery recognizes percent-encoded storage paths after HTML sanitization', () => {
  const url = 'https://example.com/cabañas/imagen.jpg';
  assert.deepEqual(
    additionalPostMedia({
      body: '<img src="https://example.com/caba%C3%B1as/imagen.jpg">',
      media: [{ id: 1, url }],
      featured_image: null,
    }),
    [],
  );
  assert.deepEqual(
    additionalPostMedia({
      body: '',
      media: [{ id: 1, url }],
      featured_image: 'https://example.com/caba%C3%B1as/imagen.jpg',
    }),
    [],
  );
});
