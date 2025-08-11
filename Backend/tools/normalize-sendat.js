// tools/normalize-sendat.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./slack.db'); // change path if DB is elsewhere

db.serialize(() => {
  db.all('SELECT id, send_at FROM scheduled_messages', (err, rows) => {
    if (err) throw err;
    rows.forEach(r => {
      let ms = Date.parse(r.send_at);
      if (isNaN(ms)) {
        // try "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SSZ"
        const alt = r.send_at.replace(' ', 'T') + 'Z';
        ms = Date.parse(alt);
      }
      if (!isNaN(ms)) {
        const iso = new Date(ms).toISOString();
        db.run('UPDATE scheduled_messages SET send_at = ? WHERE id = ?', [iso, r.id], (uerr) => {
          if (uerr) console.error('update err', uerr);
          else console.log('updated id', r.id, '->', iso);
        });
      } else {
        console.warn('could not parse', r.id, r.send_at);
      }
    });
  });
});
