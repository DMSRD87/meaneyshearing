export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Normalise AU mobile number to E.164 format (+614XXXXXXXX)
  function normaliseAU(num) {
    if (!num) return null;
    const digits = String(num).replace(/[^\d+]/g, '');
    if (digits.startsWith('+61')) return digits;
    if (digits.startsWith('61')) return '+' + digits;
    if (digits.startsWith('04')) return '+61' + digits.slice(1);
    if (digits.startsWith('4') && digits.length === 9) return '+61' + digits;
    return null;
  }

  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    return res.status(500).json({ ok: false, error: 'Twilio env vars not configured' });
  }

  // Support both { messages: [...] } (batch) and { to, body } (single)
  const messages = req.body.messages || (req.body.to ? [{ to: req.body.to, body: req.body.body }] : []);

  if (messages.length === 0) {
    return res.status(400).json({ ok: false, error: 'No messages provided' });
  }

  const results = [];
  let sent = 0, failed = 0;

  for (const msg of messages) {
    const toFormatted = normaliseAU(msg.to);
    if (!toFormatted) {
      results.push({ to: msg.to, status: 'error', error: 'Invalid AU mobile format' });
      failed++;
      continue;
    }
    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: toFormatted, From: from, Body: msg.body || '' }),
      });
      const data = await r.json();
      if (data.sid) {
        results.push({ to: toFormatted, status: 'sent', sid: data.sid });
        sent++;
      } else {
        results.push({ to: toFormatted, status: 'error', error: data.message || 'Unknown Twilio error' });
        failed++;
      }
    } catch (e) {
      results.push({ to: toFormatted, status: 'error', error: e.message });
      failed++;
    }
  }

  return res.status(failed === messages.length ? 400 : 200).json({
    ok: failed === 0,
    sent,
    failed,
    results,
  });
}
