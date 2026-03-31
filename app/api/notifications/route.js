import { supabase } from '../../lib/supabase.js'
import { sendNotificationEmail } from '../../lib/email.js'

const DASHBOARD_URL = 'https://necteraholdings.com'

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
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('due_soon, overdue, new_comment, assigned')
      .eq('user_id', parseInt(userId))
      .single()

    const prefs = {
      dueSoon: data?.due_soon !== undefined ? data.due_soon : defaultPrefs.dueSoon,
      overdue: data?.overdue !== undefined ? data.overdue : defaultPrefs.overdue,
      newComment: data?.new_comment !== undefined ? data.new_comment : defaultPrefs.newComment,
      assigned: data?.assigned !== undefined ? data.assigned : defaultPrefs.assigned,
    }

    return new Response(JSON.stringify(prefs), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'cron') {
    const secret = searchParams.get('secret')
    if (secret !== process.env.CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { data: employeeData } = await supabase
      .from('employees')
      .select('data')
      .limit(1)
      .single()

    const users = employeeData?.data || []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let sent = 0

    for (const user of users) {
      if (!user.email) continue

      const { data: prefData } = await supabase
        .from('notification_preferences')
        .select('due_soon, overdue')
        .eq('user_id', parseInt(user.id))
        .single()

      const prefs = {
        dueSoon: prefData?.due_soon !== undefined ? prefData.due_soon : defaultPrefs.dueSoon,
        overdue: prefData?.overdue !== undefined ? prefData.overdue : defaultPrefs.overdue,
      }

      const { data: tasksData } = await supabase
        .from('light_tasks')
        .select('*')

      const lightTasks = tasksData || []
      const userTasks = lightTasks.filter(t =>
        t.assigned_to && t.assigned_to.toLowerCase().includes(user.name.toLowerCase().split(' ')[0])
        && t.status !== 'Complete'
      )

      for (const task of userTasks) {
        if (!task.due_date) continue
        const due = new Date(task.due_date + 'T12:00:00')

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

  if (action === 'save_prefs') {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: parseInt(body.userId),
          due_soon: body.dueSoon,
          overdue: body.overdue,
          new_comment: body.newComment,
          assigned: body.assigned,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'send') {
    const { toEmail, toName, toUserId, subject, title, body: msgBody, actionUrl, actionLabel } = body

    const { data: prefData } = await supabase
      .from('notification_preferences')
      .select('new_comment, assigned')
      .eq('user_id', parseInt(toUserId))
      .single()

    const prefs = {
      newComment: prefData?.new_comment !== undefined ? prefData.new_comment : defaultPrefs.newComment,
      assigned: prefData?.assigned !== undefined ? prefData.assigned : defaultPrefs.assigned,
    }

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
