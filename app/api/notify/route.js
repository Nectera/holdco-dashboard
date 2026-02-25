export async function POST(request) {
  try {
    const { toEmail, toName, fromName, noteTitle, noteContent, company } = await request.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nectera Dashboard <onboarding@resend.dev>',
        to: [toEmail],
        subject: fromName + ' tagged you in a note: ' + noteTitle,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="background: #0f0e0d; padding: 16px 24px; border-radius: 6px 6px 0 0;">
              <h2 style="color: #c9a84c; margin: 0; font-size: 1rem;">Nectera Holdings</h2>
            </div>
            <div style="background: #fdfaf5; border: 1px solid #e0d8cc; border-top: none; padding: 24px; border-radius: 0 0 6px 6px;">
              <p style="color: #3a3530; margin: 0 0 16px 0;">Hi ${toName},</p>
              <p style="color: #3a3530; margin: 0 0 16px 0;"><strong>${fromName}</strong> tagged you in a note under <strong>${company}</strong>.</p>
              <div style="background: white; border: 1px solid #e0d8cc; border-radius: 6px; padding: 16px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0; font-size: 0.95rem; color: #0f0e0d;">${noteTitle}</h3>
                <p style="margin: 0; color: #8a8070; font-size: 0.85rem; line-height: 1.6; white-space: pre-wrap;">${noteContent}</p>
              </div>
              <p style="color: #8a8070; font-size: 0.75rem; margin: 16px 0 0 0;">Visit <a href="https://necteraholdings.com" style="color: #c9a84c;">necteraholdings.com</a> to view the full note.</p>
            </div>
          </div>
        `,
      }),
    })

    const data = await res.json()
    if (data.id) {
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
    } else {
      return new Response(JSON.stringify({ error: data.message || 'Failed to send' }), { status: 400 })
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
