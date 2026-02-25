import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'

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
      return new Response(JSON.stringify({ success: true, user: { id: user.id, name: user.name, username: user.username, role: user.role } }), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: false, error: 'Invalid username or password' }), { status: 401 })
  }

  if (action === 'list') {
    const users = await redis.get('nectera:users') || []
    return new Response(JSON.stringify(users.map(u => ({ id: u.id, name: u.name, username: u.username, role: u.role }))), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}

export async function POST(request) {
  const { action, username, password, name, role, userId, adminPassword } = await request.json()

  // Verify admin
  const users = await redis.get('nectera:users') || []
  const admin = users.find(u => u.role === 'admin' && u.passwordHash === hashPassword(adminPassword))

  if (action === 'create') {
    // Allow first user creation without admin check
    if (users.length > 0 && !admin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    if (users.find(u => u.username === username)) return new Response(JSON.stringify({ error: 'Username already exists' }), { status: 400 })
    const newUser = { id: Date.now(), name, username, passwordHash: hashPassword(password), role: role || 'member' }
    await redis.set('nectera:users', [...users, newUser])
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (!admin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  if (action === 'delete') {
    const updated = users.filter(u => u.id !== userId)
    await redis.set('nectera:users', updated)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'update_password') {
    const updated = users.map(u => u.id === userId ? { ...u, passwordHash: hashPassword(password) } : u)
    await redis.set('nectera:users', updated)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
