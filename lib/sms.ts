// Sends the OTP SMS via Termii (termii.com) — a widely used SMS gateway for
// Nigerian numbers, chosen because Twilio's NGN coverage/pricing is often
// worse. Swap this out for Africa's Talking or another provider if you
// prefer; only this file needs to change.
//
// Requires TERMII_API_KEY and TERMII_SENDER_ID in env vars. Phone numbers
// should be in E.164 format, e.g. +2348012345678.
export async function sendOtpSms(to: string, code: string) {
  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TERMII_API_KEY,
      to,
      from: process.env.TERMII_SENDER_ID ?? "Nestegg",
      sms: `${code} is your Nestegg verification code. It expires in 10 minutes.`,
      type: "plain",
      channel: "generic",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Termii failed: ${body}`);
  }
}
