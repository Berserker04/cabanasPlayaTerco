import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_REVIEW_IMAGE_BYTES,
  validateReview,
  validateReviewImages,
  reviewApiErrors,
  reviewPageAfterRemoval,
  reviewEditNotice,
} from '../src/lib/review-utils.ts';

const photo = (name = 'playa.jpg', type = 'image/jpeg', size = 1000) => ({
  name,
  type,
  size,
});
const valid = {
  rating: 5,
  title: '',
  body: 'Disfrutamos mucho la estancia frente al mar.',
};

test('edit notices describe immediate public updates and preserve moderation decisions', () => {
  assert.match(reviewEditNotice('approved'), /de inmediato/);
  for (const status of ['pending', 'rejected']) {
    assert.match(reviewEditNotice(status), /seguirá oculta/);
  }
});

test('review photos accept 0–3 images and count saved and newly selected files together', () => {
  for (let n = 0; n <= 3; n++)
    assert.equal(
      validateReviewImages(Array.from({ length: n }, () => photo())),
      null,
    );
  assert.equal(validateReviewImages([photo()], 2), null);
  assert.match(validateReviewImages([photo(), photo()], 2), /1 foto más/);
  assert.match(validateReviewImages([photo()], 3), /0 fotos más/);
  assert.match(
    validateReviewImages(Array.from({ length: 4 }, () => photo())),
    /No se añadió esta selección/,
  );
});

test('selection rejects unsupported, empty and oversized files while accepting the exact size boundary', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp'])
    assert.equal(
      validateReviewImages([photo('foto', type, MAX_REVIEW_IMAGE_BYTES)]),
      null,
    );
  assert.match(
    validateReviewImages([
      photo('grande.jpg', 'image/jpeg', MAX_REVIEW_IMAGE_BYTES + 1),
    ]),
    /grande.jpg.*10 MB/,
  );
  assert.match(
    validateReviewImages([photo('video.mp4', 'video/mp4')]),
    /JPG, PNG o WebP/,
  );
  assert.match(
    validateReviewImages([photo('vacia.jpg', 'image/jpeg', 0)]),
    /vacío/,
  );
});

test('a failed batch validation leaves the caller selection untouched', () => {
  const selected = [photo('primera.jpg')];
  const incoming = [
    photo('segunda.jpg'),
    photo('tercera.jpg'),
    photo('cuarta.jpg'),
  ];
  assert.ok(validateReviewImages(incoming, selected.length));
  assert.deepEqual(selected, [photo('primera.jpg')]);
  assert.equal(incoming.length, 3);
});

test('review fields enforce trimmed text, optional title and whole-star ratings', () => {
  assert.deepEqual(validateReview(valid), {});
  assert.deepEqual(
    validateReview({
      ...valid,
      title: 'a'.repeat(255),
      body: 'a'.repeat(5000),
    }),
    {},
  );
  assert.ok(validateReview({ ...valid, body: ` ${'a'.repeat(19)} ` }).body);
  assert.ok(validateReview({ ...valid, body: 'a'.repeat(5001) }).body);
  assert.ok(validateReview({ ...valid, title: 'a'.repeat(256) }).title);
  for (const rating of [0, 6, 2.5, NaN])
    assert.ok(validateReview({ ...valid, rating }).rating);
});

test('file-specific API errors are attached to the image selector', () => {
  assert.deepEqual(
    reviewApiErrors({
      'images.1': ['Archivo demasiado grande'],
      body: ['Comentario corto'],
    }),
    { images: 'Archivo demasiado grande', body: 'Comentario corto' },
  );
  assert.deepEqual(reviewApiErrors({ file: ['Error al subir'] }), {
    images: 'Error al subir',
  });
});

test('deleting the last item returns to an existing page', () => {
  assert.equal(reviewPageAfterRemoval(3, 1), 2);
  assert.equal(reviewPageAfterRemoval(1, 1), 1);
  assert.equal(reviewPageAfterRemoval(3, 2), 3);
});
