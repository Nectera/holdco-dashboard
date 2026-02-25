import { Redis } from '@upstash/redis'
import { createHash, randomBytes } from 'crypto'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

const hashPassword = (password) => createHash('sha256').update(password + 'nectera_salt_2026').digest('hex')

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'login') {
    const username = searchParams.get('username')
    const password = searchParams.get('password')
    const users = await redis.get('nectera:users') || []
    const user = users.find(u => u.username === username && u.passwordHash === hashPassword(password))
    if (user) {
      return new Response(JSON.stringify({ success: true, user: { id: user.id, name: user.name, username: user.username, role: user.role, email: user.email } }), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: false, error: 'Invalid username or password' }), { status: 401 })
  }

  if (action === 'list') {
    const users = await redis.get('nectera:users') || []
    return new Response(JSON.stringify(users.map(u => ({ id: u.id, name: u.name, username: u.username, role: u.role, email: u.email }))), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'reset_password') {
    const token = searchParams.get('token')
    const newPassword = searchParams.get('password')
    const resetData = await redis.get('nectera:reset:' + token)
    if (!resetData) return new Response(JSON.stringify({ error: 'Invalid or expired reset link' }), { status: 400 })
    const users = await redis.get('nectera:users') || []
    const updated = users.map(u => u.id === resetData.userId ? { ...u, passwordHash: hashPassword(newPassword) } : u)
    await redis.set('nectera:users', updated)
    await redis.del('nectera:reset:' + token)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}

export async function POST(request) {
  const body = await request.json()
  const { action } = body
  const users = await redis.get('nectera:users') || []

  if (action === 'forgot_password') {
    const { email } = body
    const user = users.find(u => u.email === email)
    if (!user) return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
    const token = randomBytes(32).toString('hex')
    await redis.set('nectera:reset:' + token, { userId: user.id }, { ex: 3600 })
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

  const { adminPassword } = body
  const admin = users.find(u => u.role === 'admin' && u.passwordHash === hashPassword(adminPassword))

  if (action === 'create') {
    if (users.length > 0 && !admin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    if (users.find(u => u.username === body.username)) return new Response(JSON.stringify({ error: 'Username already exists' }), { status: 400 })
    const newUser = { id: Date.now(), name: body.name, username: body.username, email: body.email || '', passwordHash: hashPassword(body.password), role: body.role || 'member' }
    await redis.set('nectera:users', [...users, newUser])
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (!admin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  if (action === 'delete') {
    const updated = users.filter(u => u.id !== body.userId)
    await redis.set('nectera:users', updated)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
