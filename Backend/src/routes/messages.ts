import { Router } from 'express';
import axios from 'axios';
import { getValidBotToken } from '../utils/token'; // ✅ use the refresh-aware helper

const router = Router();

/**
 * GET /api/channels
 * Returns list of channels (public + private) for the workspace
 */
router.get('/channels', async (_req, res) => {
  try {
    const token = await getValidBotToken(); // ✅ will refresh if needed

    const resSlack = await axios.get('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        types: 'public_channel,private_channel',
        limit: 200
      }
    });

    if (!resSlack.data.ok) {
      return res.status(400).json({ error: resSlack.data.error, data: resSlack.data });
    }

    const channels = (resSlack.data.channels || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      is_member: c.is_member
    }));

    res.json(channels);
  } catch (err: any) {
    console.error('GET /api/channels error', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

/**
 * POST /api/send
 * Body JSON: { channel: "<channel_id>", text: "message text" }
 */
router.post('/send', async (req, res) => {
  const { channel, text } = req.body;
  if (!channel || !text) {
    return res.status(400).json({ error: 'channel and text are required' });
  }

  try {
    const token = await getValidBotToken(); // ✅ will refresh if needed

    const resp = await axios.post(
      'https://slack.com/api/chat.postMessage',
      { channel, text },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!resp.data.ok) {
      // common errors: not_in_channel, channel_not_found, invalid_auth
      return res.status(400).json({ error: resp.data.error, data: resp.data });
    }

    res.json({ ok: true, result: resp.data });
  } catch (err: any) {
    console.error('POST /api/send error', err?.message || err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
