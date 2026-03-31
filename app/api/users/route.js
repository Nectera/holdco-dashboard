import { createHash, randomBytes } from 'crypto'
import { supabase } from '../../lib/supabase.js'
import { sendWelcomeEmail } from '../../lib/email.js'

const hashPassword = (password) => createHash('sha256').update(password + 'nectera_salt_2026').digest('hex')

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'login') {
    const username = searchParams.get('username')
    const password = searchParams.get('password')
    const passwordHash = hashPassword(password)

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', username)
      .eq('password_hash', passwordHash)

    if (error) {
      return new Response(JSON.stringify({ success: false, error: 'Database error' }), { status: 500 })
    }

    if (users && users.length > 0) {
      const user = users[0]
      return new Response(JSON.stringify({ success: true, user: { id: user.id, name: user.name, username: user.username, role: user.role, email: user.email } }), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: false, error: 'Invalid username or password' }), { status: 401 })
  }

  if (action === 'list') {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, username, role, email')

    if (error) {
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 })
    }

    return new Response(JSON.stringify(users || []), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'reset_password') {
    const token = searchParams.get('token')
    const newPassword = searchParams.get('password')

    const { data: resetTokens, error: selectError } = await supabase
      .from('password_reset_tokens')
      .select('user_id, expires_at')
      .eq('token', token)

    if (selectError || !resetTokens || resetTokens.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid or expired reset link' }), { status: 400 })
    }

    const resetToken = resetTokens[0]
    const now = new Date()
    if (new Date(resetToken.expires_at) < now) {
      return new Response(JSON.stringify({ error: 'Invalid or expired reset link' }), { status: 400 })
    }

    const newPasswordHash = hashPassword(newPassword)
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', resetToken.user_id)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to reset password' }), { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('token', token)

    if (deleteError) {
      console.error('Failed to delete reset token:', deleteError)
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}

export async function POST(request) {
  const body = await request.json()
  const { action } = body

  if (action === 'forgot_password') {
    const { email } = body

    const { data: users, error: selectError } = await supabase
      .from('users')
      .select('id, name')
      .eq('email', email)

    if (selectError) {
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    const user = users[0]
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()

    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({ user_id: user.id, token, expires_at: expiresAt })

    if (insertError) {
      console.error('Failed to create reset token:', insertError)
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    const resetUrl = process.env.NEXT_PUBLIC_APP_URL + '/reset-password?token=' + token
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Nectera Dashboard <onboarding@resend.dev>',
        to: [email],
        subject: 'Reset your Nectera password',
        html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px"><div style="background:#0f0e0d;padding:16px 24px;border-radius:6px 6px 0 0"><h2 style="color:#c9a84c;margin:0">Nectera Holdings</h2></div><div style="background:#fdfaf5;border:1px solid #e0d8cc;border-top:none;padding:24px;border-radius:0 0 6px 6px"><p>Hi ${user.name},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#0f0e0d;color:white;border-radius:4px;text-decoration:none;margin:16px 0">Reset Password</a><p style="color:#8a8070;font-size:0.8rem">If you didn't request this, ignore this email.</p></div></div>`
      })
    })
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Check admin authorization for actions that require it
  const { adminPassword } = body

  let admin = null
  if (adminPassword) {
    const adminPasswordHash = hashPassword(adminPassword)
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .eq('password_hash', adminPasswordHash)

    if (!adminError && adminUsers && adminUsers.length > 0) {
      admin = adminUsers[0]
    }
  }

  if (action === 'create') {
    // Check if any users exist
    const { data: existingUsers, error: countError } = await supabase
      .from('users')
      .select('id')

    if (existingUsers && existingUsers.length > 0 && !admin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Check if username already exists
    const { data: usernameCheck, error: checkError } = await supabase
      .from('users')
      .select('id')
      .ilike('username', body.username)

    if (!checkError && usernameCheck && usernameCheck.length > 0) {
      return new Response(JSON.stringify({ error: 'Username already exists' }), { status: 400 })
    }

    const newUser = {
      name: body.name,
      username: body.username,
      email: body.email || '',
      password_hash: hashPassword(body.password),
      role: body.role || 'member'
    }

    const { error: insertError } = await supabase
      .from('users')
      .insert(newUser)

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to create user' }), { status: 500 })
    }

    if (body.email) {
      try {
        await sendWelcomeEmail({ name: body.name, username: body.username, password: body.password, email: body.email })
      } catch (e) {
        console.error('email failed', e)
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  if (action === 'update') {
    const { error: updateError } = await supabase
      .from('users')
      .update({ name: body.name, email: body.email, role: body.role, updated_at: new Date().toISOString() })
      .eq('id', body.userId)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update user' }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'reset_password_admin') {
    const newPasswordHash = hashPassword(body.newPassword)
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', body.userId)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to reset password' }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'delete') {
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', body.userId)

    if (deleteError) {
      return new Response(JSON.stringify({ error: 'Failed to delete user' }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
