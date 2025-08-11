import { Router } from 'express';
import { getValidBotToken } from '../utils/token';

const router = Router();

router.post('/refresh-test', async (_req, res) => {
  try {
    const token = await getValidBotToken(); // should refresh if expired
    res.json({ ok: true, token: token.substring(0, 15) + '...' });
  } catch (err: any) {
    console.error('refresh-test error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
