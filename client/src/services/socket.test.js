import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSocketUrl } from './socket.js';

test('uses the configured backend socket URL when provided', () => {
  assert.equal(
    resolveSocketUrl({
      envSocketUrl: 'https://api.example.com',
      currentOrigin: 'https://app.example.com',
    }),
    'https://api.example.com'
  );
});

test('does not connect to the frontend Vercel host when no socket backend is configured', () => {
  assert.equal(
    resolveSocketUrl({
      envSocketUrl: '',
      currentOrigin: 'https://smart-hosptial-portal-m3tr.vercel.app',
    }),
    null
  );
});

test('uses the same-origin socket URL in local development', () => {
  assert.equal(
    resolveSocketUrl({
      envSocketUrl: '',
      currentOrigin: 'http://localhost:5173',
    }),
    'http://localhost:5173'
  );
});
