
import { Router } from 'express';
import axios from 'axios';
import { initDB } from '../utils/db';

const router = Router();

router.get('/slack', (_req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID!;
  const redirectUri = encodeURIComponent('https://localhost:4000/auth/slack/callback');
  const scope = encodeURIComponent('chat:write,channels:read,groups:read,im:read,mpim:read');

  res.redirect(
    `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}`
  );
});

router.get('/slack/callback', async (req, res) => {
  const { code } = req.query as { code?: string };
  if (!code) return res.status(400).send('Missing code');

  try {
    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: 'https://localhost:4000/auth/slack/callback',
    });

    const tokenResp = await axios.post('https://slack.com/api/oauth.v2.access', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = tokenResp.data;
    if (!data.ok) {
      console.error('oauth.v2.access error:', data);
      return res.status(400).json(data);
    }

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    const db = await initDB();
    await db.run(
      `INSERT INTO tokens (access_token, refresh_token, token_type, expires_at)
       VALUES (?, ?, ?, ?)`,
      [data.access_token, data.refresh_token ?? null, data.token_type ?? 'bot', expiresAt]
    );

    const frontend = process.env.FRONTEND_URL || 'https://localhost:4200';
    res.redirect(`${frontend}/?connected=true`);
  } catch (err: any) {
    console.error('/auth/slack/callback error:', err?.response?.data || err?.message || err);
    res.status(500).send('OAuth callback failed');
  }
});

export default router;
