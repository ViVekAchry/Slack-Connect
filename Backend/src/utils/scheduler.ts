// backend/src/utils/scheduler.ts
import cron from 'node-cron';
import { initDB } from './db';
import axios from 'axios';
import { getValidBotToken } from './token'; // ✅ refresh-aware helper

async function sendToSlack(channel: string, text: string) {
  const token = await getValidBotToken(); // ✅ always fresh token

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

  if (!resp.data.ok) throw new Error(resp.data.error || 'Slack API error');
  return resp.data;
}

// Parse DB send_at into epoch ms robustly
function parseSendAtToMillis(sendAtValue: string): number {
  let ms = Date.parse(sendAtValue);
  if (!isNaN(ms)) return ms;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(sendAtValue)) {
    const iso = sendAtValue.replace(' ', 'T') + 'Z';
    ms = Date.parse(iso);
    if (!isNaN(ms)) return ms;
  }

  ms = Date.parse(sendAtValue.replace(' ', 'T'));
  return ms;
}

export async function checkAndSendMessages() {
  const db = await initDB();
  const nowMs = Date.now();
  console.log(`⏱ Scheduler check at ${new Date(nowMs).toISOString()} (UTC)`);

  const rows = await db.all('SELECT * FROM scheduled_messages WHERE sent = 0');
  if (!rows || rows.length === 0) {
    console.log('📭 No pending scheduled messages.');
    return;
  }

  for (const msg of rows) {
    const sendMs = parseSendAtToMillis(msg.send_at);
    if (isNaN(sendMs)) {
      console.warn(`⚠️ Cannot parse send_at for id=${msg.id} (${msg.send_at}). Skipping.`);
      continue;
    }

    if (sendMs <= nowMs) {
      try {
        console.log(`📨 Sending scheduled message id=${msg.id} (due ${msg.send_at})`);
        await sendToSlack(msg.channel, msg.text);
        await db.run('UPDATE scheduled_messages SET sent = 1 WHERE id = ?', [msg.id]);
        console.log(`✅ Sent scheduled message ${msg.id}`);
      } catch (err: any) {
        console.error(`❌ Failed to send scheduled ${msg.id}:`, err?.message || err);
      }
    }
  }
}

const scheduler = {
  start: () => {
    console.log('⏳ Scheduler started — checking every minute (UTC based)');
    cron.schedule('* * * * *', async () => {
      await checkAndSendMessages();
    });
    checkAndSendMessages().catch(e => console.error('scheduler start error', e));
  },
  checkAndSendMessages
};

export default scheduler;
