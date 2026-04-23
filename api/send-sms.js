export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { to, body } = req.body;
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
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    const data = await r.json();
    if (data.sid) return res.status(200).json({ ok: true, sid: data.sid });
    return res.status(400).json({ ok: false, error: data.message });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
  
