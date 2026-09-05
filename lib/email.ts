// Sends the OTP email via Resend, matching the stack used elsewhere in
// your projects. Requires RESEND_API_KEY in env vars.
export async function sendOtpEmail(to: string, code: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Nestegg <onboarding@resend.dev>",
      to,
      subject: `${code} is your Nestegg verification code`,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="color:#0B2E5C;">Verify your email</h2>
          <p style="color:#5B6B85;">Enter this code to continue. It expires in 10 minutes.</p>
          <p style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color:#1B4FC4;">${code}</p>
          <p style="color:#5B6B85; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed: ${body}`);
  }
}
