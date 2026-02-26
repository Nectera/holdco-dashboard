import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendWelcomeEmail({ name, username, password, email }) {
  const loginUrl = 'https://necteraholdings.com'

  const html = `
    <html>
    <body style="margin:0;padding:0;background:#0f0e0d;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0e0d;padding:40px 20px;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#f4f0e8;border-radius:16px;overflow:hidden;max-width:520px;width:100%;">
            <tr><td style="background:#0f0e0d;padding:28px 36px;text-align:center;">
              <span style="background:#c9a84c;border-radius:8px;padding:6px 12px;color:#0f0e0d;font-size:18px;font-weight:700;">N</span>
              <span style="color:#f4f0e8;font-size:18px;margin-left:10px;">Nectera Holdings</span>
            </td></tr>
            <tr><td style="padding:36px;">
              <p style="margin:0 0 8px;font-size:22px;color:#0f0e0d;">Welcome, ${name}!</p>
              <p style="margin:0 0 24px;font-size:14px;color:#8a8070;">Your account has been created. Here are your login details:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;margin-bottom:24px;">
                <tr><td style="padding:20px 24px;border-bottom:1px solid #f0ece4;">
                  <p style="margin:0 0 4px;font-size:11px;color:#a09880;text-transform:uppercase;">Username</p>
                  <p style="margin:0;font-size:16px;color:#0f0e0d;font-weight:500;">${username}</p>
                </td></tr>
                <tr><td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:11px;color:#a09880;text-transform:uppercase;">Temporary Password</p>
                  <p style="margin:0;font-size:16px;color:#0f0e0d;font-family:monospace;">${password}</p>
                </td></tr>
              </table>
              <a href="${loginUrl}" style="display:block;background:#0f0e0d;color:#f4f0e8;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;margin-bottom:24px;">Sign In to Nectera Holdings</a>
              <p style="margin:0;font-size:12px;color:#a09880;">Please change your password after your first login.</p>
            </td></tr>
            <tr><td style="padding:20px 36px;border-top:1px solid #e8e2d9;text-align:center;">
              <p style="margin:0;font-size:11px;color:#c0b8ac;">Nectera Holdings - necteraholdings.com</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: '"Nectera Holdings" <' + process.env.GMAIL_USER + '>',
    to: email,
    subject: 'Welcome to Nectera Holdings, ' + name,
    html,
  })
}

export async function sendNotificationEmail({ toEmail, toName, subject, title, body, actionUrl, actionLabel }) {
  const html = `
    <html>
    <body style="margin:0;padding:0;background:#0f0e0d;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0e0d;padding:40px 20px;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#f4f0e8;border-radius:16px;overflow:hidden;max-width:520px;width:100%;">
            <tr><td style="background:#0f0e0d;padding:24px 36px;text-align:center;">
              <span style="background:#c9a84c;border-radius:8px;padding:6px 12px;color:#0f0e0d;font-size:18px;font-weight:700;">N</span>
              <span style="color:#f4f0e8;font-size:18px;margin-left:10px;">Nectera Holdings</span>
            </td></tr>
            <tr><td style="padding:36px;">
              <p style="margin:0 0 6px;font-size:20px;color:#0f0e0d;font-weight:600;">${title}</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b6560;line-height:1.6;">${body}</p>
              ${actionUrl ? `<a href="${actionUrl}" style="display:block;background:#0f0e0d;color:#f4f0e8;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;margin-bottom:24px;">${actionLabel || 'View in Dashboard'}</a>` : ''}
              <p style="margin:0;font-size:12px;color:#a09880;">You're receiving this because you have notifications enabled. Manage preferences at necteraholdings.com.</p>
            </td></tr>
            <tr><td style="padding:20px 36px;border-top:1px solid #e8e2d9;text-align:center;">
              <p style="margin:0;font-size:11px;color:#c0b8ac;">Nectera Holdings · necteraholdings.com</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
  await transporter.sendMail({
    from: '"Nectera Holdings" <' + process.env.GMAIL_USER + '>',
    to: toEmail,
    subject,
    html,
  })
}
