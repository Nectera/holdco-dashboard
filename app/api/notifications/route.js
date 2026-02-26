import { Redis } from '@upstash/redis'
import { sendNotificationEmail } from '../../lib/email.js'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

const DASHBOARD_URL = 'https://necteraholdings.com'

// Default preferences for new users
const defaultPrefs = {
  dueSoon: true,
  overdue: true,
  newComment: true,
  assigned: true,
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const userId = searchParams.get('userId')

  if (action === 'prefs') {
    const prefs = await redis.get('nectera:notif_prefs:' + userId) || defaultPrefs
    return new Response(JSON.stringify(prefs), { headers: { 'Content-Type': 'application/json' } })
  }

  // Cron: check due/overdue tasks and send emails
  if (action === 'cron') {
    const secret = searchParams.get('secret')
    if (secret !== process.env.CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const users = await redis.get('nectera:users') || []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let sent = 0

    for (const user of users) {
      if (!user.email) continue
      const prefs = await redis.get('nectera:notif_prefs:' + user.id) || defaultPrefs

      // Get tasks assigned to this user from light tasks
      const lightTasks = await redis.get('nectera:light_tasks') || []
      const userTasks = lightTasks.filter(t =>
        t.assignedTo && t.assignedTo.toLowerCase().includes(user.name.toLowerCase().split(' ')[0])
        && t.status !== 'Complete'
      )

      for (const task of userTasks) {
        if (!task.dueDate) continue
        const due = new Date(task.dueDate + 'T12:00:00')

        // Due tomorrow
        if (prefs.dueSoon && due.toDateString() === tomorrow.toDateString()) {
          await sendNotificationEmail({
            toEmail: user.email,
            toName: user.name,
            subject: '⏰ Task due tomorrow: ' + task.name,
            title: 'Task due tomorrow',
            body: `<strong>${task.name}</strong> is due tomorrow${task.company ? ' · ' + task.company : ''}. Don't forget to wrap it up!`,
            actionUrl: DASHBOARD_URL,
            actionLabel: 'View Tasks'
          })
          sent++
        }

        // Overdue
        if (prefs.overdue && due < today) {
          const daysAgo = Math.floor((today - due) / (1000 * 60 * 60 * 24))
          await sendNotificationEmail({
            toEmail: user.email,
            toName: user.name,
            subject: '🚨 Overdue task: ' + task.name,
            title: 'Task overdue',
            body: `<strong>${task.name}</strong> was due ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago${task.company ? ' · ' + task.company : ''}. Please update its status or reschedule.`,
            actionUrl: DASHBOARD_URL,
            actionLabel: 'View Tasks'
          })
          sent++
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}

export async function POST(request) {
  const body = await request.json()
  const { action } = body

  // Save preferences
  if (action === 'save_prefs') {
    await redis.set('nectera:notif_prefs:' + body.userId, {
      dueSoon: body.dueSoon,
      overdue: body.overdue,
      newComment: body.newComment,
      assigned: body.assigned,
    })
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Send instant notification (comment or assignment)
  if (action === 'send') {
    const { toEmail, toName, toUserId, subject, title, body: msgBody, actionUrl, actionLabel } = body

    // Check user prefs
    const prefs = await redis.get('nectera:notif_prefs:' + toUserId) || defaultPrefs

    const triggerMap = { comment: 'newComment', assigned: 'assigned' }
    const prefKey = triggerMap[body.trigger]
    if (prefKey && !prefs[prefKey]) {
      return new Response(JSON.stringify({ success: false, reason: 'User has disabled this notification' }), { headers: { 'Content-Type': 'application/json' } })
    }

    await sendNotificationEmail({ toEmail, toName, subject, title, body: msgBody, actionUrl, actionLabel })
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
