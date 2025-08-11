// backend/src/routes/schedule.ts
import { Router } from 'express';
import axios from 'axios';
import { initDB } from '../utils/db';
import scheduler from '../utils/scheduler'; 
import { getValidBotToken } from '../utils/token';
const router = Router();

async function sendToSlack(channel: string, text: string) {
  const token = await getValidBotToken(); 
  const resp = await axios.post(
    'https://slack.com/api/chat.postMessage',
    { channel, text },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  if (!resp.data.ok) throw new Error(resp.data.error || 'Slack API error');
  return resp.data;
}

/**
 * POST /api/schedule
 * Body: { channel, text, send_at }  -> send_at can be local ISO (no Z) or timezone-aware ISO
 * We parse it *as local if no timezone given*, then store UTC ISO in DB.
 */
router.post('/', async (req, res) => {
  const { channel, text, send_at } = req.body;
  if (!channel || !text || !send_at)
    return res.status(400).json({ error: 'channel, text, send_at are required' });

  // Parse input into a Date object (handles both timezone-aware and local ISO)
  const parsed = new Date(send_at);
  if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'send_at must be a valid ISO datetime' });

  // store UTC ISO string (normalized)
  const sendAtUTC = parsed.toISOString(); // normalized UTC

  try {
    const db = await initDB();

    // Compare using local "now" vs parsed (parsed was created from local if input had no timezone)
    if (parsed.getTime() <= Date.now()) {
      // Immediate send attempt
      try {
        const slackResp = await sendToSlack(channel, text);
        await db.run(
          'INSERT INTO scheduled_messages (channel, text, send_at, sent) VALUES (?, ?, ?, ?)',
          [channel, text, sendAtUTC, 1]
        );
        return res.json({ ok: true, sent_now: true, slack: slackResp });
      } catch (err: any) {
        // Save for retry if immediate send failed
        const r = await db.run(
          'INSERT INTO scheduled_messages (channel, text, send_at, sent) VALUES (?, ?, ?, ?)',
          [channel, text, sendAtUTC, 0]
        );
        return res.status(500).json({
          ok: false,
          error: 'Immediate send failed; saved for retry',
          detail: err.message,
          scheduled_id: r.lastID
        });
      }
    } else {
      // Future: store normalized UTC, then trigger scheduler to check (covers near-future)
      const result = await db.run(
        'INSERT INTO scheduled_messages (channel, text, send_at) VALUES (?, ?, ?)',
        [channel, text, sendAtUTC]
      );

      console.log(`📅 Scheduled id=${result.lastID} send_at (UTC)=${sendAtUTC}`);

      // trigger a check right away (scheduler exports checkAndSendMessages)
      try { await (scheduler as any).checkAndSendMessages?.(); } catch(e) { /* non-fatal */ }

      return res.json({ ok: true, scheduled_id: result.lastID, stored_as_utc: sendAtUTC });
    }
  } catch (err) {
    console.error('POST /api/schedule error', err);
    res.status(500).json({ error: 'Failed to schedule message' });
  }
});

/**
 * GET /api/schedule
 * Returns all scheduled messages, but converts send_at and created_at to IST for display
 */
router.get('/', async (req, res) => {
  try {
    const db = await initDB();
    const rows = await db.all(
      'SELECT id, channel, text, send_at, sent, created_at FROM scheduled_messages ORDER BY send_at ASC'
    );

    // convert UTC -> IST for readability
    const rowsIST = rows.map((row: any) => {
      // send_at and created_at are stored in DB as UTC ISO (or older rows might be other formats)
      const sendUTC = new Date(row.send_at);
      const createdUTC = new Date(row.created_at);

      const toISTStr = (d: Date) => {
        const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
        return ist.toISOString().replace('T', ' ').substring(0, 19); // "YYYY-MM-DD hh:mm:ss"
      };

      return {
        ...row,
        send_at: toISTStr(sendUTC),
        created_at: toISTStr(createdUTC)
      };
    });

    res.json(rowsIST);
  } catch (err) {
    console.error('GET /api/schedule error', err);
    res.status(500).json({ error: 'Failed to list scheduled messages' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await initDB();

    // Check if pending
    const msg = await db.get('SELECT sent FROM scheduled_messages WHERE id = ?', [req.params.id]);
    if (!msg) {
      return res.status(404).json({ error: 'Scheduled message not found' });
    }
    if (msg.sent === 1) {
      return res.status(400).json({ error: 'Message already sent, cannot cancel' });
    }

    await db.run('DELETE FROM scheduled_messages WHERE id = ?', [req.params.id]);
    res.json({ ok: true, message: 'Scheduled message cancelled' });
  } catch (err) {
    console.error('DELETE /api/schedule/:id error', err);
    res.status(500).json({ error: 'Failed to cancel scheduled message' });
  }
});


export default router;
