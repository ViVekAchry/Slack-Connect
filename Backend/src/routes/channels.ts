
import { Router } from 'express';
import axios from 'axios';
import { getValidBotToken } from '../utils/token'; 

const router = Router();

router.get('/channels', async (_req, res) => {
  try {
    const token = await getValidBotToken(); 

    const resp = await axios.get('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${token}` },
      params: { types: 'public_channel,private_channel', limit: 1000 }
    });

    if (!resp.data.ok) {
      return res.status(500).json({ error: resp.data.error, data: resp.data });
    }

    const channels = (resp.data.channels || []).map((c: any) => ({
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

export default router;
