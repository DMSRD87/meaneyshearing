export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { to, body } = req.body;

  // Normalise AU mobile number to E.164 format (+614XXXXXXXX)
  function normaliseAU(num) {
    if (!num) return null;
    const digits = String(num).replace(/[^\d+]/g, ''); // strip spaces, dashes, brackets
    if (digits.startsWith('+61')) return digits;
    if (digits.startsWith('61')) return '+' + digits;
    if (digits.startsWith('04')) return '+61' + digits.slice(1);
    if (digits.startsWith('4') && digits.length === 9) return '+61' + digits;
    return null; // invalid
  }

  const toFormatted = normaliseAU(to);
  if (!toFormatted) {
    return res.status(400).json({ ok: false, error: `Invalid AU mobile: ${to}` });
  }

  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from = process.env.TWILIO_FROM;

  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: toFormatted, From: from, Body: body }),
    });
    const data = await r.json();
    if (data.sid) return res.status(200).json({ ok: true, sid: data.sid });
    return res.status(400).json({ ok: false, error: data.message });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
