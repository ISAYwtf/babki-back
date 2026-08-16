import express from 'express';
import request from 'supertest';
import { configureTrustedProxy } from './trusted-proxy';

describe('configureTrustedProxy', () => {
  it('ignores forwarded client addresses by default', async () => {
    const app = express();
    configureTrustedProxy(app, false);
    app.get('/ip', (req, res) => res.json({ ip: req.ip }));

    const response = await request(app)
      .get('/ip')
      .set('X-Forwarded-For', '203.0.113.10')
      .expect(200);

    expect(response.body.ip).not.toBe('203.0.113.10');
  });

  it('uses forwarded client addresses only for an explicit trust policy', async () => {
    const app = express();
    configureTrustedProxy(app, 'loopback');
    app.get('/ip', (req, res) => res.json({ ip: req.ip }));

    const response = await request(app)
      .get('/ip')
      .set('X-Forwarded-For', '203.0.113.10')
      .expect(200);

    expect(response.body.ip).toBe('203.0.113.10');
  });
});
