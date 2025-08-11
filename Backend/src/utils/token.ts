import axios from 'axios';
import { initDB } from './db';
import dotenv from 'dotenv';
dotenv.config();

export async function getValidBotToken(): Promise<string> {
  const db = await initDB();
  let tokenRow = await db.get(
    'SELECT id, access_token, refresh_token, expires_at FROM tokens ORDER BY id DESC LIMIT 1'
  );
  if (!tokenRow) throw new Error('No Slack token found. Connect Slack first.');

  const now = Date.now();
  const expiry = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;

  // If token is still valid, return it
  if (expiry > now + 60000) { // 1 min buffer
    return tokenRow.access_token;
  }

  // Otherwise refresh
  console.log('🔄 Refreshing Slack access token...');
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    client_secret: process.env.SLACK_CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: tokenRow.refresh_token
  });

  const resp = await axios.post('https://slack.com/api/oauth.v2.access', params);
  if (!resp.data.ok) {
    throw new Error(`Failed to refresh token: ${resp.data.error}`);
  }

  const newAccess = resp.data.access_token;
  const newRefresh = resp.data.refresh_token || tokenRow.refresh_token;
  const expiresIn = resp.data.expires_in; // seconds
  const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

  await db.run(
    'INSERT INTO tokens (access_token, refresh_token, expires_at, token_type) VALUES (?, ?, ?, ?)',
    [newAccess, newRefresh, newExpiry, resp.data.token_type || 'bot']
  );

  console.log('✅ Token refreshed and saved.');
  console.log("🔄 Checking token validity...");
console.log("Token row from DB:", tokenRow);
  return newAccess;
}
