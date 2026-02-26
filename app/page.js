'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const getTotalExpenses = (report) => {
  return getMetric(report, 'Total Expenses') + getMetric(report, 'Total Cost of Goods Sold')
}

const getMetric = (report, label) => {
  try {
    const rows = report?.Rows?.Row || []
    for (const row of rows) {
      if (row?.Summary?.ColData?.[0]?.value === label) {
        return parseFloat(row.Summary.ColData[1]?.value || 0)
      }
    }
  } catch { return 0 }
  return 0
}

const fmt = (val) => {
  const abs = Math.abs(val)
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })


  return (val < 0 ? '-$' : '$') + str
}

const fmtK = (val) => {
  if (Math.abs(val) >= 1000) return (val < 0 ? '-$' : '$') + Math.round(Math.abs(val) / 1000) + 'k'
  return fmt(val)
}

const statusColor = (status) => {
  const s = (status || '').toLowerCase()
  if (s.includes('complete')) return { bg: '#e8f0e8', color: '#4a6741' }
  if (s.includes('in progress')) return { bg: '#e8f0f8', color: '#3d5a6e' }
  if (s.includes('planning')) return { bg: '#f0f0e8', color: '#6a6a40' }
  return { bg: '#f5f1ea', color: '#8a8070' }
}

const priorityColor = (priority) => {
  const p = (priority || '').toLowerCase()
  if (p === 'high') return { bg: '#fde8e8', color: '#b85c38' }
  if (p === 'medium') return { bg: '#fdf3e0', color: '#9a6a20' }
  if (p === 'low') return { bg: '#e8f0e8', color: '#4a6741' }
  return { bg: '#f5f1ea', color: '#8a8070' }
}

const updateTask = async (companyKey, rowIndex, field, value) => {
  const res = await fetch('/api/tasks/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyKey, rowIndex, field, value }),
  })
  return res.json()
}

const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3, '': 4 }

const shortName = (name) => {
  if (name.includes('Xtract')) return 'Xtract'
  if (name.includes('Bug')) return 'Bug Control'
  if (name.includes('Lush')) return 'Lush Green'
  return name
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
        <div style={{ fontWeight: '600', marginBottom: '0.4rem' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {fmtK(p.value)}</div>
        ))}
      </div>
    )
  }
  return null
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '4px',
  border: '1px solid #e0d8cc',
  fontSize: '0.85rem',
  background: 'white',
  color: '#1a1814',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: '0.75rem',
  color: '#8a8070',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.3rem',
  display: 'block',
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function Home() {

  const NavIcon = ({ id, active }) => {
    const base = active ? '#c9a84c' : '#6b6560'
    const accent = active ? '#ffffff' : '#3a3530'
    const s = { display: 'block' }
    if (id === 'financials') return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={s}>
        <rect x="1" y="9" width="4" height="8" rx="1" fill={base} opacity="0.7"/>
        <rect x="7" y="5" width="4" height="12" rx="1" fill={base}/>
        <rect x="13" y="1" width="4" height="16" rx="1" fill={accent} opacity="0.9"/>
        <path d="M2 7 L9 3 L16 1" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
    if (id === 'messages') return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={s}>
        <rect x="1" y="2" width="16" height="11" rx="2.5" fill={base} opacity="0.8"/>
        <path d="M4 14 L3 17 L8 14" fill={accent}/>
        <rect x="4" y="6" width="5" height="1.5" rx="0.75" fill={accent} opacity="0.9"/>
        <rect x="4" y="9" width="8" height="1.5" rx="0.75" fill={accent} opacity="0.6"/>
      </svg>
    )
    if (id === 'calendar') return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={s}>
        <rect x="1" y="3" width="16" height="14" rx="2" fill={base} opacity="0.7"/>
        <rect x="1" y="3" width="16" height="5" rx="2" fill={base}/>
        <rect x="5" y="1" width="2" height="4" rx="1" fill={accent}/>
        <rect x="11" y="1" width="2" height="4" rx="1" fill={accent}/>
        <rect x="4" y="11" width="2.5" height="2.5" rx="0.5" fill={accent} opacity="0.8"/>
        <rect x="7.75" y="11" width="2.5" height="2.5" rx="0.5" fill={accent} opacity="0.5"/>
        <rect x="11.5" y="11" width="2.5" height="2.5" rx="0.5" fill={accent} opacity="0.3"/>
      </svg>
    )
    if (id === 'notes') return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={s}>
        <rect x="2" y="1" width="12" height="16" rx="2" fill={base} opacity="0.7"/>
        <rect x="5" y="1" width="12" height="16" rx="2" fill={base}/>
        <rect x="7.5" y="5" width="7" height="1.5" rx="0.75" fill={accent} opacity="0.9"/>
        <rect x="7.5" y="8.5" width="5" height="1.5" rx="0.75" fill={accent} opacity="0.6"/>
        <rect x="7.5" y="12" width="6" height="1.5" rx="0.75" fill={accent} opacity="0.4"/>
        <rect x="3" y="5" width="2.5" height="9" rx="1" fill={accent} opacity="0.3"/>
      </svg>
    )
    if (id === 'tasks') return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={s}>
        <rect x="1" y="1" width="16" height="16" rx="3" fill={base} opacity="0.6"/>
        <rect x="1" y="1" width="16" height="6" rx="3" fill={base}/>
        <path d="M5 5 L7.5 7.5 L12 3" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="4" y="11" width="10" height="1.5" rx="0.75" fill={accent} opacity="0.7"/>
        <rect x="4" y="14" width="7" height="1.5" rx="0.75" fill={accent} opacity="0.4"/>
      </svg>
    )
    if (id === 'projects') return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={s}>
        <rect x="1" y="1" width="7.5" height="7.5" rx="2" fill={base}/>
        <rect x="9.5" y="1" width="7.5" height="7.5" rx="2" fill={base} opacity="0.5"/>
        <rect x="1" y="9.5" width="7.5" height="7.5" rx="2" fill={base} opacity="0.5"/>
        <rect x="9.5" y="9.5" width="7.5" height="7.5" rx="2" fill={accent} opacity="0.8"/>
        <path d="M11.5 13.5 L13 15 L16 11.5" stroke={base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
    if (id === 'team') return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={s}>
        <circle cx="6.5" cy="5.5" r="3.5" fill={base}/>
        <path d="M1 16 C1 12.5 3.5 10 6.5 10 C9.5 10 12 12.5 12 16" fill={base} opacity="0.7"/>
        <circle cx="13" cy="6" r="2.5" fill={accent} opacity="0.8"/>
        <path d="M11 16 C11 13.5 12 11.5 13 11.5 C15 11.5 17 13.5 17 16" fill={accent} opacity="0.6"/>
      </svg>
    )
    if (id === 'settings') return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={s}>
        <circle cx="9" cy="9" r="3" fill={accent} opacity="0.9"/>
        <path d="M9 1.5 L9 4M9 14 L9 16.5M1.5 9 L4 9M14 9 L16.5 9M3.7 3.7 L5.5 5.5M12.5 12.5 L14.3 14.3M14.3 3.7 L12.5 5.5M5.5 12.5 L3.7 14.3" stroke={base} strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="9" cy="9" r="5.5" stroke={base} strokeWidth="1.5" fill="none" opacity="0.5"/>
      </svg>
    )
    return null
  }

  const [authed, setAuthed] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => { try { return JSON.parse(localStorage.getItem('currentUser') || 'null') } catch { return null } })
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStatus, setForgotStatus] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const isMobile = useIsMobile()
  const [page, setPage] = useState('financials')
  const [data, setData] = useState([])
  const [tasks, setTasks] = useState([])
  const [loadingFinancials, setLoadingFinancials] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [filterCompany, setFilterCompany] = useState('all')
  const [showNotifications, setShowNotifications] = useState(false)
  const [dismissedNotifications, setDismissedNotifications] = useState([])
  const [notifTab, setNotifTab] = useState('projects')
  const [filterStatus, setFilterStatus] = useState('In Progress')
  const [saving, setSaving] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [expandedTask, setExpandedTask] = useState(null)
  const [commentPanel, setCommentPanel] = useState(false)
  const [activeCommentProject, setActiveCommentProject] = useState(null)
  const [comments, setComments] = useState([])
  const [projectCommentText, setProjectCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [showEmojiFor, setShowEmojiFor] = useState(null)
  const [newTask, setNewTask] = useState({ companyKey: '', name: '', lead: '', status: '', priority: '', dueDate: '', teamMembers: '', notes: '' })
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [employees, setEmployees] = useState([])
  const [lightTasks, setLightTasks] = useState([])
  const [showLightTaskModal, setShowLightTaskModal] = useState(false)
  const [editingLightTask, setEditingLightTask] = useState(null)
  const [lightTaskForm, setLightTaskForm] = useState({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', company: '', status: 'Not Started', notes: '' })
  const [lightTaskFilter, setLightTaskFilter] = useState('all')
  const [userList, setUserList] = useState([])
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [convoMessages, setConvoMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [showNewConvo, setShowNewConvo] = useState(false)
  const [newConvoName, setNewConvoName] = useState('')
  const [newConvoMembers, setNewConvoMembers] = useState([])
  const [newConvoType, setNewConvoType] = useState('dm')
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarSelected, setCalendarSelected] = useState(null)
  const [calendarEvents, setCalendarEvents] = useState([])
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [calendarForm, setCalendarForm] = useState({ title: '', date: '', time: '', company: '', notes: '', assignedTo: '' })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [newUserForm, setNewUserForm] = useState({ name: '', username: '', password: '', email: '', role: 'member' })
  const [editingUser, setEditingUser] = useState(null)
  const [editUserForm, setEditUserForm] = useState({ name: '', email: '', role: 'member' })
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [userMgmtError, setUserMgmtError] = useState('')
  const [userMgmtSuccess, setUserMgmtSuccess] = useState('')
  const [notes, setNotes] = useState({})
  const [selectedNoteCompany, setSelectedNoteCompany] = useState('Nectera Holdings')
  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const [noteEditContent, setNoteEditContent] = useState('')
  const [noteEditTitle, setNoteEditTitle] = useState('')
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [commenterName, setCommenterName] = useState(() => { try { return localStorage.getItem('commenterName') || '' } catch { return '' } })

  const [notifySending, setNotifySending] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [notifySuccess, setNotifySuccess] = useState(null)


  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [employeeForm, setEmployeeForm] = useState({ name: '', role: '', company: '', phone: '', email: '', photo: '', department: '', startDate: '', notes: '' })
  const [drilldown, setDrilldown] = useState(null)
  const [reportModal, setReportModal] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [period, setPeriod] = useState('monthly')
  const [drilldownData, setDrilldownData] = useState(null)
  const [loadingDrilldown, setLoadingDrilldown] = useState(false)

  const handleLogin = () => {
    if (passwordInput === 'Nectera2026!') {
      setAuthed(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    fetch('/api/notes').then(r => r.json()).then(data => setNotes(data)).catch(() => {})
    fetch('/api/team').then(r => r.json()).then(data => setEmployees(data)).catch(() => {})
    fetch('/api/lighttasks').then(r => r.json()).then(data => setLightTasks(data)).catch(() => {})
    fetch('/api/calendar').then(r => r.json()).then(setCalendarEvents).catch(() => {})
    fetch('/api/users?action=list').then(r => r.json()).then(data => setUserList(data)).catch(() => {})
    if (currentUser) {
      fetch('/api/messages?action=conversations&userId=' + currentUser.id).then(r => r.json()).then(setConversations).catch(() => {})
      fetch('/api/messages?action=unread&userId=' + currentUser.id).then(r => r.json()).then(d => setUnreadMessages(d.unread || 0)).catch(() => {})
    }
  }, [authed])

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!authed || !currentUser) return
    const interval = setInterval(() => {
      fetch('/api/messages?action=conversations&userId=' + currentUser.id).then(r => r.json()).then(setConversations).catch(() => {})
      fetch('/api/messages?action=unread&userId=' + currentUser.id).then(r => r.json()).then(d => setUnreadMessages(d.unread || 0)).catch(() => {})
      if (activeConvo) {
        fetch('/api/messages?action=messages&convoId=' + activeConvo.id).then(r => r.json()).then(setConvoMessages).catch(() => {})
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [authed, currentUser, activeConvo])

  useEffect(() => {
    if (!authed) return
    setLoadingFinancials(true)
    fetch(`/api/qb/financials?year=${selectedYear}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoadingFinancials(false) })
      .catch(() => setLoadingFinancials(false))
    fetch('/api/tasks?company=all')
      .then(res => res.json())
      .then(d => { setTasks(d.tasks || []); setLoadingTasks(false) })
      .catch(() => setLoadingTasks(false))
  }, [authed, selectedYear])

  const handleEdit = async (task, field, value) => {
    const globalIndex = tasks.indexOf(task)
    setSaving(s => ({ ...s, [`${globalIndex}-${field}`]: true }))
    const newTasks = [...tasks]
    newTasks[globalIndex] = { ...task, [field]: value }
    setTasks(newTasks)
    await updateTask(task.companyKey, task.rowIndex, field, value)
    setSaving(s => ({ ...s, [`${globalIndex}-${field}`]: false }))
  }

  const handleCreate = async () => {
    if (!newTask.name || !newTask.companyKey) return
    setCreating(true)
    const res = await fetch('/api/tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    })
    const result = await res.json()
    if (result.success) {
      const companyNames = { nectera: 'Nectera Holdings', xtract: 'Xtract Environmental Services', bcs: 'Bug Control Specialist', lush: 'Lush Green Landscapes' }
      setTasks(t => [...t, { ...newTask, company: companyNames[newTask.companyKey] }])
      setNewTask({ companyKey: '', name: '', lead: '', status: '', priority: '', dueDate: '', teamMembers: '', notes: '' })
      setShowModal(false)
    }
    setCreating(false)
  }

  const handleDelete = async (task) => {
    const res = await fetch('/api/tasks/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyKey: task.companyKey, rowIndex: task.rowIndex }),
    })
    const result = await res.json()
    if (result.success) {
      setTasks(t => t.filter(t2 => t2 !== task))
      setConfirmDelete(null)
    }
  }

  const addComment = (company, noteId) => {
    if (!projectCommentText.trim()) return
    const updated = { ...notes }
    const name = (currentUser ? currentUser.name : commenterName.trim()) || 'Anonymous'
    try { localStorage.setItem('commenterName', name) } catch {}
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const comment = { id: Date.now(), author: name, text: commentText.trim(), date: dateStr }
    updated[company] = (updated[company] || []).map(n => n.id === noteId ? { ...n, comments: [...(n.comments || []), comment] } : n)
    setNotes(updated)
    setProjectCommentText('')
    fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company, notes: updated[company] }) }).catch(() => {})
  }

  const deleteComment = (company, noteId, commentId) => {
    const updated = { ...notes }
    updated[company] = (updated[company] || []).map(n => n.id === noteId ? { ...n, comments: (n.comments || []).filter(c => c.id !== commentId) } : n)
    setNotes(updated)
    try { localStorage.setItem('companyNotes', JSON.stringify(updated)) } catch {}
  }

  

  

  const uploadFile = async (company, noteId, file) => {
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        const attachment = { url: data.url, name: data.name, size: data.size, type: data.type, uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
        const updated = { ...notes }
        updated[company] = (updated[company] || []).map(n => n.id === noteId ? { ...n, attachments: [...(n.attachments || []), attachment] } : n)
        setNotes(updated)
        fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company, notes: updated[company] }) }).catch(() => {})
      }
    } catch (err) {
      console.error('Upload failed', err)
    }
    setUploadingFile(false)
  }

  const removeAttachment = async (company, noteId, url) => {
    await fetch('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
    const updated = { ...notes }
    updated[company] = (updated[company] || []).map(n => n.id === noteId ? { ...n, attachments: (n.attachments || []).filter(a => a.url !== url) } : n)
    setNotes(updated)
    fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company, notes: updated[company] }) }).catch(() => {})
  }

  const saveNote = (company, id, title, content_text) => {
    const updated = { ...notes }
    if (!updated[company]) updated[company] = []
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    updated[company] = updated[company].map(n => n.id === id ? { ...n, title: title || 'Untitled', content: content_text, date: dateStr } : n)
    setNotes(updated)
    fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company, notes: updated[company] }) }).catch(() => {})
  }

  const deleteNote = (company, id) => {
    const updated = { ...notes, [company]: (notes[company] || []).filter(n => n.id !== id) }
    setNotes(updated)
    setSelectedNoteId(null)
    setNoteEditContent('')
    setNoteEditTitle('')
    fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company, notes: updated[company] }) }).catch(() => {})
  }

  const togglePinNote = (company, id) => {
    const updated = { ...notes, [company]: (notes[company] || []).map(n => n.id === id ? { ...n, pinned: !n.pinned } : n) }
    setNotes(updated)
    fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company, notes: updated[company] }) }).catch(() => {})
  }

  const currentNotes = (notes[selectedNoteCompany] || []).slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  const selectedNote = currentNotes.find(n => n.id === selectedNoteId) || null

  const saveLightTask = (task) => {
    let updated
    if (editingLightTask !== null) {
      updated = lightTasks.map((t, i) => i === editingLightTask ? task : t)
    } else {
      updated = [...lightTasks, { ...task, createdDate: new Date().toISOString().split('T')[0] }]
    }
    setLightTasks(updated)
    fetch('/api/lighttasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks: updated }) }).catch(() => {})
    setShowLightTaskModal(false)
    setEditingLightTask(null)
    setLightTaskForm({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', company: '', status: 'Not Started', notes: '' })
  }

  const deleteLightTask = (idx) => {
    const updated = lightTasks.filter((_, i) => i !== idx)
    setLightTasks(updated)
    try { localStorage.setItem('lightTasks', JSON.stringify(updated)) } catch {}
  }

  

    const saveEmployee = (emp) => {
    let updated
    if (editingEmployee !== null) {
      updated = employees.map((e, i) => i === editingEmployee ? emp : e)
    } else {
      updated = [...employees, emp]
    }
    setEmployees(updated)
    fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employees: updated }) }).catch(() => {})
    setShowEmployeeModal(false)
    setEditingEmployee(null)
    setEmployeeForm({ name: '', role: '', company: '', phone: '', email: '', photo: '', department: '', startDate: '', notes: '' })
  }

  const deleteEmployee = (idx) => {
    const updated = employees.filter((_, i) => i !== idx)
    setEmployees(updated)
    fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employees: updated }) }).catch(() => {})
  }

  const loadConversations = async () => {
    if (!currentUser) return
    const res = await fetch('/api/messages?action=conversations&userId=' + currentUser.id)
    const data = await res.json()
    setConversations(data)
  }

  const loadMessages = async (convoId) => {
    const res = await fetch('/api/messages?action=messages&convoId=' + convoId)
    const data = await res.json()
    setConvoMessages(data)
    // Mark as read
    if (currentUser) {
      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_read', convoId, userId: currentUser.id }) })
      loadUnread()
    }
  }

  const loadUnread = async () => {
    if (!currentUser) return
    const res = await fetch('/api/messages?action=unread&userId=' + currentUser.id)
    const data = await res.json()
    setUnreadMessages(data.unread || 0)
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !activeConvo || !currentUser) return
    const text = messageText.trim()
    setMessageText('')
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send_message', convoId: activeConvo.id, senderId: currentUser.id, senderName: currentUser.name, text }) })
    loadMessages(activeConvo.id)
    loadConversations()
  }

  const createConversation = async () => {
    if (!currentUser) return
    const members = newConvoType === 'dm' ? [currentUser.id, ...newConvoMembers] : [currentUser.id, ...newConvoMembers]
    const name = newConvoType === 'dm' ? null : newConvoName
    const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_conversation', name, members, type: newConvoType, createdBy: currentUser.id }) })
    const convo = await res.json()
    await loadConversations()
    setActiveConvo(convo)
    loadMessages(convo.id)
    setShowNewConvo(false)
    setNewConvoName('')
    setNewConvoMembers([])
  }

  const exportReportPDF = async () => {
    if (!reportData) return
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const isLandscape = reportData.columns && reportData.columns.length > 2
    const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait' })
    const pageWidth = doc.internal.pageSize.width

    // Header
    doc.setFillColor(15, 14, 13)
    doc.rect(0, 0, pageWidth, 28, 'F')
    doc.setTextColor(201, 168, 76)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Nectera Holdings', 14, 13)
    doc.setTextColor(180, 170, 150)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(reportData.title + ' · ' + reportData.company + ' · ' + selectedYear, 14, 21)
    doc.setTextColor(120, 110, 100)
    doc.setFontSize(8)
    doc.text('Generated ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), pageWidth - 14, 21, { align: 'right' })

    const isAging = reportData.rows.some(r => r.isAging)
    let tableHead, tableBody
    const fmt = (v) => v ? '$' + parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
    if (isAging) {
      tableHead = [['Name', 'Current', '1-30', '31-60', '61-90', '91+', 'Total']]
      tableBody = reportData.rows.filter(r => !r.colHeaders).map(row => [
        row.label || '',
        fmt(row.current), fmt(row.over30), fmt(row.over60), fmt(row.over90), fmt(row.over91), fmt(row.value)
      ])
    } else {
      tableHead = [['Description', 'Amount']]
      tableBody = reportData.rows.map(row => {
        const indent = '  '.repeat(row.depth || 0)
        const val = row.value ? '$' + parseFloat(row.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
        return [indent + (row.label || ''), val]
      })
    }

    autoTable(doc, {
      startY: 35,
      head: tableHead,
      body: tableBody,
      headStyles: { fillColor: [15, 14, 13], textColor: [201, 168, 76], fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: [250, 247, 240] },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const row = reportData.rows[data.row.index]
          if (row && (row.isHeader || row.isTotal)) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = row.isTotal ? [240, 236, 224] : [245, 241, 234]
          }
        }
      }
    })

    const pageHeight = doc.internal.pageSize.height
    doc.setFillColor(245, 241, 234)
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F')
    doc.setTextColor(138, 128, 112)
    doc.setFontSize(7)
    doc.text('Nectera Holdings · Confidential · necteraholdings.com', pageWidth / 2, pageHeight - 4, { align: 'center' })

    doc.save('Nectera-' + reportData.title.replace(/\s+/g, '-') + '-' + reportData.company.split(' ')[0] + '-' + selectedYear + '.pdf')
  }

  const exportFinancialsPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()

    // Header
    doc.setFillColor(15, 14, 13)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(201, 168, 76)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Nectera Holdings', 14, 13)
    doc.setTextColor(180, 170, 150)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Portfolio Financial Summary · ' + selectedYear, 14, 21)

    // Date
    doc.setTextColor(120, 110, 100)
    doc.setFontSize(8)
    doc.text('Generated ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 196, 21, { align: 'right' })

    // Consolidated section
    doc.setTextColor(15, 14, 13)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Consolidated', 14, 40)

    const getM = (report, name) => {
      if (!report?.Rows?.Row) return 0
      const find = (rows) => {
        for (const row of rows) {
          if (row.Summary?.ColData?.[0]?.value === name) return parseFloat(row.Summary.ColData[1]?.value || 0)
          if (row.Rows?.Row) { const r = find(row.Rows.Row); if (r !== null) return r }
        }
        return null
      }
      return find(report.Rows.Row) || 0
    }
    const totalRevenue = data.reduce((s, f) => s + getM(f.report, 'Total Income'), 0)
    const totalExpenses = data.reduce((s, f) => s + getM(f.report, 'Total Expenses') + getM(f.report, 'Cost of Goods Sold'), 0)
    const totalNet = totalRevenue - totalExpenses
    const totalMargin = totalRevenue ? ((totalNet / totalRevenue) * 100).toFixed(1) : '0.0'

    autoTable(doc, {
      startY: 44,
      head: [['Metric', 'Amount']],
      body: [
        ['Total Revenue', '$' + totalRevenue.toLocaleString()],
        ['Total Expenses', '$' + totalExpenses.toLocaleString()],
        ['Net Income', '$' + totalNet.toLocaleString()],
        ['Net Margin', totalMargin + '%'],
      ],
      headStyles: { fillColor: [15, 14, 13], textColor: [201, 168, 76], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [250, 247, 240] },
      margin: { left: 14, right: 14 },
    })

    // Per-company section
    const afterConsolidated = doc.lastAutoTable.finalY + 12
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 14, 13)
    doc.text('By Subsidiary', 14, afterConsolidated)

    const companyRows = data.map(f => {
      const rev = getM(f.report, 'Total Income')
      const exp = getM(f.report, 'Total Expenses') + getM(f.report, 'Cost of Goods Sold')
      const net = rev - exp
      const margin = rev ? ((net / rev) * 100).toFixed(1) + '%' : '0.0%'
      return [f.company, '$' + Math.round(rev).toLocaleString(), '$' + Math.round(getM(f.report, 'Gross Profit')).toLocaleString(), '$' + Math.round(exp).toLocaleString(), '$' + Math.round(net).toLocaleString(), margin]
    })
    const _unused = data.map(f => [
    ])

    autoTable(doc, {
      startY: afterConsolidated + 4,
      head: [['Company', 'Revenue', 'Gross Profit', 'Expenses', 'Net Income', 'Margin']],
      body: companyRows,
      headStyles: { fillColor: [15, 14, 13], textColor: [201, 168, 76], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 247, 240] },
      margin: { left: 14, right: 14 },
    })

    // Footer
    const pageHeight = doc.internal.pageSize.height
    doc.setFillColor(245, 241, 234)
    doc.rect(0, pageHeight - 12, 210, 12, 'F')
    doc.setTextColor(138, 128, 112)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Nectera Holdings · Confidential · necteraholdings.com', 105, pageHeight - 4, { align: 'center' })

    doc.save('Nectera-Financials-' + selectedYear + '.pdf')
  }

  const openDrilldown = async (companyKey) => {
    setDrilldown(companyKey)
    setDrilldownData(null)
    setLoadingDrilldown(true)
    const res = await fetch(`/api/qb/details?company=${companyKey}&year=${selectedYear}`)
    const d = await res.json()
    setDrilldownData(d)
    setLoadingDrilldown(false)
  }

  const openReport = async (companyKey, type) => {
    setReportModal({ companyKey, type })
    setReportData(null)
    setLoadingReport(true)
    const res = await fetch('/api/qb/report?company=' + companyKey + '&type=' + type + '&year=' + selectedYear)
    const d = await res.json()
    setReportData(d)
    setLoadingReport(false)
  }

  const loadComments = async (task) => {
    const projectId = task.rowIndex || (task.companyKey + '-' + task.name.replace(/\s+/g, '-'))
    const res = await fetch('/api/comments?projectId=' + encodeURIComponent(projectId))
    setComments(await res.json())
  }

  const addProjectComment = async () => {
    if (!projectCommentText.trim() || !activeCommentProject) return
    const projectId = activeCommentProject.rowIndex || (activeCommentProject.companyKey + '-' + activeCommentProject.name.replace(/\s+/g, '-'))
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', projectId, text: projectCommentText, author: currentUser?.name || 'Unknown', authorId: currentUser?.id || '' })
    })
    const d = await res.json()
    if (d.comment) setComments(prev => [...prev, d.comment])
    setProjectCommentText('')
  }

  const reactToComment = async (commentId, emoji) => {
    const projectId = activeCommentProject.rowIndex || (activeCommentProject.companyKey + '-' + activeCommentProject.name.replace(/\s+/g, '-'))
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'react', projectId, commentId, emoji, userId: currentUser?.id || 'anon' })
    })
    const updated = await fetch('/api/comments?projectId=' + encodeURIComponent(projectId)).then(r => r.json())
    setComments(updated)
    setShowEmojiFor(null)
  }

  const deleteProjectComment = async (commentId) => {
    const projectId = activeCommentProject.rowIndex || (activeCommentProject.companyKey + '-' + activeCommentProject.name.replace(/\s+/g, '-'))
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', projectId, commentId })
    })
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const totalIncome = data.reduce((sum, s) => sum + getMetric(s.report, 'Total Income'), 0)
  const totalExpenses = data.reduce((sum, s) => sum + getTotalExpenses(s.report), 0)
  const totalNet = data.reduce((sum, s) => sum + getMetric(s.report, 'Net Income'), 0)

  const chartData = data.map(sub => ({
    name: shortName(sub.name),
    Revenue: getMetric(sub.report, 'Total Income'),
    Expenses: getTotalExpenses(sub.report),
    'Net Income': getMetric(sub.report, 'Net Income'),
  }))

  const companies = ['all', 'nectera', 'xtract', 'bcs', 'lush']
  const companyLabels = { all: 'All Companies', nectera: 'Nectera Holdings', xtract: 'Xtract', bcs: 'Bug Control', lush: 'Lush Green' }
  const statuses = ['all', 'Planning', 'In Progress', 'Complete']

  const companyKeys = {
    'Xtract Environmental Services': 'xtract',
    'Bug Control Specialist': 'bcs',
    'Lush Green Landscapes': 'lush',
  }

  const filteredTasks = tasks
    .filter(t => {
      const companyMatch = filterCompany === 'all' || t.companyKey === filterCompany
      const statusMatch = filterStatus === 'all' || (t.status || '').toLowerCase() === filterStatus.toLowerCase()
      return companyMatch && statusMatch
    })
    .sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate) : null
      const bDate = b.dueDate ? new Date(b.dueDate) : null
      if (aDate && bDate) return aDate - bDate
      if (aDate) return -1
      if (bDate) return 1
      const ap = priorityOrder[(a.priority || '').toLowerCase()] ?? 4
      const bp = priorityOrder[(b.priority || '').toLowerCase()] ?? 4
      return ap - bp
    })

  // Load dismissed notifications from localStorage

  useEffect(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem('dismissedNotifications') || '[]')
      setDismissedNotifications(dismissed)
    } catch {}
    // Employees loaded after auth
    // lightTasks loaded after auth
    // lightTasks loaded after auth
  }, [])

  const dismissNotification = (id) => {
    const updated = [...dismissedNotifications, id]
    setDismissedNotifications(updated)
    try { localStorage.setItem('dismissedNotifications', JSON.stringify(updated)) } catch {}
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in3Days = new Date(today)
  in3Days.setDate(in3Days.getDate() + 3)

  const today2 = new Date()
  today2.setHours(0, 0, 0, 0)
  const in3Days2 = new Date(today2)
  in3Days2.setDate(in3Days2.getDate() + 3)

  const taskNotifications = lightTasks.flatMap(task => {
    const notifs = []
    if (!task.name) return []
    const dueDate = task.dueDate ? new Date(task.dueDate + 'T12:00:00') : null
    const isComplete = (task.status || '').toLowerCase().includes('complete')
    const id_overdue = 'lt-overdue-' + task.name
    const id_soon = 'lt-soon-' + task.name
    if (!isComplete && dueDate && dueDate < today2) {
      notifs.push({ id: id_overdue, type: 'overdue', task: task.name, company: task.company, dueDate: task.dueDate })
    } else if (!isComplete && dueDate && dueDate <= in3Days2) {
      notifs.push({ id: id_soon, type: 'soon', task: task.name, company: task.company, dueDate: task.dueDate })
    }
    return notifs
  }).filter(n => !dismissedNotifications.includes(n.id))

  // Notes notifications - track who was notified
  const notesNotifications = Object.entries(notes).flatMap(([company, notesList]) =>
    (notesList || []).filter(n => n.notified).map(n => ({
      id: 'note-' + n.id,
      type: 'note',
      task: n.title,
      company,
      notifiedTo: n.notified,
      date: n.date,
    }))
  ).filter(n => !dismissedNotifications.includes(n.id))

  const notifications = tasks.flatMap(task => {
    const notifs = []
    if (!task.name) return []
    const dueDate = task.dueDate ? new Date(task.dueDate) : null
    const status = (task.status || '').toLowerCase()
    const isComplete = status.includes('complete')
    const id_overdue = 'overdue-' + task.companyKey + '-' + task.rowIndex
    const id_soon = 'soon-' + task.companyKey + '-' + task.rowIndex
    const id_new = 'new-' + task.companyKey + '-' + task.rowIndex

    if (!isComplete && dueDate && dueDate < today) {
      notifs.push({ id: id_overdue, type: 'overdue', task: task.name, company: task.company, dueDate: task.dueDate, companyKey: task.companyKey })
    } else if (!isComplete && dueDate && dueDate <= in3Days) {
      notifs.push({ id: id_soon, type: 'soon', task: task.name, company: task.company, dueDate: task.dueDate, companyKey: task.companyKey })
    }
    const created = task.createdDate ? new Date(task.createdDate) : null
    if (created && created >= today) {
      notifs.push({ id: id_new, type: 'new', task: task.name, company: task.company, companyKey: task.companyKey })
    }
    return notifs
  }).filter(n => !dismissedNotifications.includes(n.id))

  const activeTasks = tasks.filter(t => {
    const s = (t.status || '').toLowerCase()
    return !s.includes('complete') && s !== ''
  })

  const aggregateByPeriod = (monthly, p) => {
    if (!monthly || monthly.length === 0) return []
    if (p === 'monthly') return monthly
    if (p === 'yearly') {
      const total = monthly.reduce((acc, m) => ({ month: selectedYear, income: acc.income + m.income, expenses: acc.expenses + m.expenses, net: acc.net + m.net }), { income: 0, expenses: 0, net: 0 })
      return [{ ...total, month: selectedYear }]
    }
    if (p === 'quarterly') {
      const quarters = { Q1: { month: 'Q1', income: 0, expenses: 0, net: 0 }, Q2: { month: 'Q2', income: 0, expenses: 0, net: 0 }, Q3: { month: 'Q3', income: 0, expenses: 0, net: 0 }, Q4: { month: 'Q4', income: 0, expenses: 0, net: 0 } }
      const monthToQ = { Jan: 'Q1', Feb: 'Q1', Mar: 'Q1', Apr: 'Q2', May: 'Q2', Jun: 'Q2', Jul: 'Q3', Aug: 'Q3', Sep: 'Q3', Oct: 'Q4', Nov: 'Q4', Dec: 'Q4' }
      monthly.forEach(m => {
        const prefix = m.month.substring(0, 3)
        const q = monthToQ[prefix] || 'Q1'
        quarters[q].income += m.income
        quarters[q].expenses += m.expenses
        quarters[q].net += m.net
      })
      return Object.values(quarters)
    }
    return monthly
  }

  const periodToggle = (
    <div style={{ display: 'flex', gap: '0.25rem', background: '#f0ece0', borderRadius: '6px', padding: '0.2rem' }}>
      {['monthly', 'quarterly', 'yearly'].map(p => (
        <button key={p} onClick={() => setPeriod(p)} style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', border: 'none', background: period === p ? 'white' : 'transparent', color: period === p ? '#0f0e0d' : '#8a8070', fontSize: '0.7rem', cursor: 'pointer', fontWeight: period === p ? '600' : '400', textTransform: 'capitalize' }}>
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  )

  const selectStyle = (colors) => ({
    background: colors.bg,
    color: colors.color,
    border: 'none',
    borderRadius: '20px',
    padding: '0.15rem 0.5rem',
    fontSize: '0.65rem',
    fontWeight: '500',
    cursor: 'pointer',
  })

  const navItems = [
    { id: 'financials', label: 'Financials' },
    { id: 'messages', label: 'Messages' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'notes', label: 'Notes' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'projects', label: 'Projects' },
    { id: 'team', label: 'Team' },
    ...(currentUser?.role === 'admin' ? [{ id: 'settings', label: 'Settings' }] : []),
  ]

  const effectiveCommenterName = currentUser ? currentUser.name : commenterName

  const handleUserLogin = async () => {
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch('/api/users?action=login&username=' + encodeURIComponent(loginUsername) + '&password=' + encodeURIComponent(loginPassword))
      const data = await res.json()
      if (data.success) {
        setCurrentUser(data.user)
        setAuthed(true)
        try { localStorage.setItem('currentUser', JSON.stringify(data.user)) } catch {}
      } else {
        setLoginError(data.error || 'Invalid credentials')
      }
    } catch {
      setLoginError('Connection error')
    }
    setLoginLoading(false)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setAuthed(false)
    try { localStorage.removeItem('currentUser') } catch {}
  }

  if (!authed) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f0e0d', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ background: '#f4f0e8', borderRadius: '16px', padding: '2.5rem', width: '380px', maxWidth: '90vw', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#0f0e0d', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '700', margin: '0 auto 0.85rem auto', fontFamily: "'DM Serif Display', serif" }}>N</div>
            <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem', color: '#0f0e0d', fontFamily: "'DM Serif Display', serif", fontWeight: '400' }}>Nectera Holdings</h1>
          </div>
          <>
              <p style={{ fontSize: '0.85rem', color: '#8a8070', marginBottom: '1.5rem' }}>Sign in to your account</p>
              <input value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="Username" autoFocus style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '4px', border: '1px solid #e0d8cc', fontSize: '0.9rem', marginBottom: '0.5rem', boxSizing: 'border-box', outline: 'none' }} />
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUserLogin()} placeholder="Password" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '4px', border: '1px solid #e0d8cc', fontSize: '0.9rem', marginBottom: '0.75rem', boxSizing: 'border-box', outline: 'none' }} />
              {loginError && <p style={{ color: '#b85c38', fontSize: '0.8rem', marginBottom: '0.75rem', marginTop: '-0.25rem' }}>{loginError}</p>}
              <button onClick={handleUserLogin} disabled={loginLoading} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '500', opacity: loginLoading ? 0.6 : 1 }}>{loginLoading ? 'Signing in...' : 'Sign In'}</button>
              <button onClick={() => setShowForgotPassword(!showForgotPassword)} style={{ marginTop: '0.5rem', width: '100%', background: 'none', border: 'none', color: '#8a8070', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}>Forgot password?</button>
              {showForgotPassword && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f4f0e8', borderRadius: '6px' }}>
                  <p style={{ fontSize: '0.78rem', color: '#3a3530', margin: '0 0 0.5rem 0' }}>Enter your email to receive a reset link</p>
                  <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="your@email.com" style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', fontSize: '0.82rem', marginBottom: '0.5rem', boxSizing: 'border-box', outline: 'none' }} />
                  {forgotStatus && <p style={{ fontSize: '0.75rem', color: '#4a6741', margin: '0 0 0.5rem 0' }}>{forgotStatus}</p>}
                  <button onClick={async () => {
                    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'forgot_password', email: forgotEmail }) })
                    setForgotStatus('If that email exists, a reset link has been sent!')
                    setForgotEmail('')
                  }} style={{ width: '100%', padding: '0.4rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: '0.78rem' }}>Send Reset Link</button>
                </div>
              )}
            </>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', fontFamily: 'sans-serif' }}>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', width: '500px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>New Task</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Company *</label>
                <select value={newTask.companyKey} onChange={e => setNewTask(t => ({ ...t, companyKey: e.target.value }))} style={inputStyle}>
                  <option value="">Select company...</option>
                  <option value="nectera">Nectera Holdings</option>
                  <option value="xtract">Xtract Environmental Services</option>
                  <option value="bcs">Bug Control Specialist</option>
                  <option value="lush">Lush Green Landscapes</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Task Name *</label>
                <input value={newTask.name} onChange={e => setNewTask(t => ({ ...t, name: e.target.value }))} placeholder="What needs to be done?" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={newTask.status} onChange={e => setNewTask(t => ({ ...t, status: e.target.value }))} style={inputStyle}>
                    <option value="">No status</option>
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))} style={inputStyle}>
                    <option value="">No priority</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Project Lead</label>
                  <input value={newTask.lead} onChange={e => setNewTask(t => ({ ...t, lead: e.target.value }))} placeholder="Name..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Due Date</label>
                  <input value={newTask.dueDate} onChange={e => setNewTask(t => ({ ...t, dueDate: e.target.value }))} placeholder="MM/DD/YYYY" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Team Members</label>
                <input value={newTask.teamMembers} onChange={e => setNewTask(t => ({ ...t, teamMembers: e.target.value }))} placeholder="Names separated by commas..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={newTask.notes} onChange={e => setNewTask(t => ({ ...t, notes: e.target.value }))} placeholder="Additional details..." style={{ ...inputStyle, height: '100px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button onClick={handleCreate} disabled={creating || !newTask.name || !newTask.companyKey} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: '0.85rem', opacity: (creating || !newTask.name || !newTask.companyKey) ? 0.5 : 1 }}>
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
        <div style={{ width: '220px', background: '#0f0e0d', color: '#f5f1ea', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0 }}>
          <div style={{ borderBottom: '1px solid #2a2825', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#c9a84c', color: '#0f0e0d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0, fontFamily: "'DM Serif Display', serif" }}>N</div>
              <h2 style={{ fontSize: '1.1rem', margin: 0, fontFamily: "'DM Serif Display', serif", fontWeight: '400', letterSpacing: '0.02em' }}>Nectera Holdings</h2>
            </div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setPage(item.id); setDrilldown(null) }} style={{ background: page === item.id && !drilldown ? 'rgba(201,168,76,0.08)' : 'transparent', color: page === item.id && !drilldown ? '#c9a84c' : '#d4cfc8', border: 'none', borderLeft: page === item.id && !drilldown ? '2px solid #c9a84c' : '2px solid transparent', borderRadius: '0 6px 6px 0', padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <NavIcon id={item.id} active={page === item.id && !drilldown} />
                {item.label}
              </button>
            ))}
          </nav>
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: '0.68rem', color: '#444', paddingTop: '1rem', borderTop: '1px solid #2a2825' }}>Live · QuickBooks + Sheets</div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: isMobile ? '90vw' : '440px', background: 'white', border: 'none', borderRadius: '14px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', zIndex: 150, maxHeight: '70vh', minHeight: '300px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f0ece0' }}>
            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Notifications</span>
            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8070', fontSize: '1rem' }}>X</button>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid #f0ece0' }}>
            {[['projects', 'Projects', notifications.length], ['tasks', 'Tasks', taskNotifications.length], ['notes', 'Notes', notesNotifications.length]].map(([id, label, count]) => (
              <button key={id} onClick={() => setNotifTab(id)} style={{ flex: 1, padding: '0.6rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: notifTab === id ? '600' : '400', color: notifTab === id ? '#0f0e0d' : '#8a8070', borderBottom: notifTab === id ? '2px solid #c9a84c' : '2px solid transparent' }}>
                {label}{count > 0 ? ' (' + count + ')' : ''}
              </button>
            ))}
          </div>
          {notifTab === 'projects' && notifications.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#8a8070', fontSize: '0.85rem' }}>No project alerts</div>}
          {notifTab === 'tasks' && taskNotifications.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#8a8070', fontSize: '0.85rem' }}>No task alerts</div>}
          {notifTab === 'tasks' && taskNotifications.map(n => (
            <div key={n.id} style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f5f1ea', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '20px', background: n.type === 'overdue' ? '#fde8e8' : '#fdf3e0', color: n.type === 'overdue' ? '#b85c38' : '#9a6a20', fontWeight: '600' }}>
                    {n.type === 'overdue' ? 'Overdue' : 'Due Soon'}
                  </span>
                  {n.company && <span style={{ fontSize: '0.65rem', color: '#8a8070' }}>{n.company.split(' ')[0]}</span>}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#0f0e0d' }}>{n.task}</div>
                {n.dueDate && <div style={{ fontSize: '0.7rem', color: '#8a8070', marginTop: '0.15rem' }}>Due: {n.dueDate}</div>}
              </div>
              <button onClick={() => dismissNotification(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '0.85rem', padding: '0.1rem', flexShrink: 0 }}>✕</button>
            </div>
          ))}
          {notifTab === 'notes' && notesNotifications.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#8a8070', fontSize: '0.85rem' }}>No note notifications</div>}
          {notifTab === 'notes' && notesNotifications.map(n => (
            <div key={n.id} style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f5f1ea', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '20px', background: '#e8f0e8', color: '#4a6741', fontWeight: '600' }}>Note</span>
                  <span style={{ fontSize: '0.65rem', color: '#8a8070' }}>{n.company?.split(' ')[0]}</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#0f0e0d' }}>{n.task}</div>
                {n.notifiedTo && <div style={{ fontSize: '0.7rem', color: '#8a8070', marginTop: '0.15rem' }}>Notified: {n.notifiedTo}</div>}
              </div>
              <button onClick={() => dismissNotification(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '0.85rem', padding: '0.1rem', flexShrink: 0 }}>✕</button>
            </div>
          ))}
          {notifTab === 'projects' && notifications.map(n => (
            <div key={n.id} style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f5f1ea', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '20px',
                    background: n.type === 'overdue' ? '#fde8e8' : n.type === 'soon' ? '#fdf3e0' : '#e8f0e8',
                    color: n.type === 'overdue' ? '#b85c38' : n.type === 'soon' ? '#9a6a20' : '#4a6741',
                    fontWeight: '600' }}>
                    {n.type === 'overdue' ? 'Overdue' : n.type === 'soon' ? 'Due Soon' : 'New Task'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#8a8070' }}>{n.company?.split(' ')[0]}</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#0f0e0d' }}>{n.task}</div>
                {n.dueDate && <div style={{ fontSize: '0.7rem', color: '#8a8070', marginTop: '0.15rem' }}>Due: {n.dueDate}</div>}
              </div>
              <button onClick={() => dismissNotification(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '0.85rem', padding: '0.1rem', flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {showEmployeeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', width: '480px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{editingEmployee !== null ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); setEmployeeForm({ name: '', role: '', company: '', phone: '', email: '', photo: '', department: '', startDate: '', notes: '' }) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input value={employeeForm.name} onChange={e => setEmployeeForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Role / Title</label>
                  <input value={employeeForm.role} onChange={e => setEmployeeForm(f => ({ ...f, role: e.target.value }))} placeholder="Operations Manager" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Company</label>
                  <select value={employeeForm.company} onChange={e => setEmployeeForm(f => ({ ...f, company: e.target.value }))} style={inputStyle}>
                    <option value="">Select company...</option>
                    <option value="Nectera Holdings">Nectera Holdings</option>
                    <option value="Xtract Environmental Services">Xtract Environmental Services</option>
                    <option value="Bug Control Specialist">Bug Control Specialist</option>
                    <option value="Lush Green Landscapes">Lush Green Landscapes</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input value={employeeForm.phone} onChange={e => setEmployeeForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 555-5555" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input value={employeeForm.email} onChange={e => setEmployeeForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Photo URL (optional)</label>
                <input value={employeeForm.photo} onChange={e => setEmployeeForm(f => ({ ...f, photo: e.target.value }))} placeholder="https://..." style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Department</label>
                  <input value={employeeForm.department || ''} onChange={e => setEmployeeForm(f => ({ ...f, department: e.target.value }))} placeholder="Operations" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" value={employeeForm.startDate || ''} onChange={e => setEmployeeForm(f => ({ ...f, startDate: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={employeeForm.notes || ''} onChange={e => setEmployeeForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional info..." style={{ ...inputStyle, height: '60px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); setEmployeeForm({ name: '', role: '', company: '', phone: '', email: '', photo: '', department: '', startDate: '', notes: '' }) }} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button onClick={() => saveEmployee(employeeForm)} disabled={!employeeForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: '0.85rem', fontWeight: '500', opacity: !employeeForm.name ? 0.5 : 1 }}>
                  {editingEmployee !== null ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLightTaskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', width: '480px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{editingLightTask !== null ? 'Edit Task' : 'Add Task'}</h2>
              <button onClick={() => { setShowLightTaskModal(false); setEditingLightTask(null); setLightTaskForm({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', company: '', status: 'Not Started', notes: '' }) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Task Name *</label>
                <input value={lightTaskForm.name} onChange={e => setLightTaskForm(f => ({ ...f, name: e.target.value }))} placeholder="What needs to be done?" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Assigned To</label>
                  <input value={lightTaskForm.assignedTo} onChange={e => setLightTaskForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Name..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Due Date</label>
                  <input type="date" value={lightTaskForm.dueDate} onChange={e => setLightTaskForm(f => ({ ...f, dueDate: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select value={lightTaskForm.priority} onChange={e => setLightTaskForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={lightTaskForm.status} onChange={e => setLightTaskForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Blocked</option>
                    <option>Complete</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Company</label>
                <select value={lightTaskForm.company} onChange={e => setLightTaskForm(f => ({ ...f, company: e.target.value }))} style={inputStyle}>
                  <option value="">All Companies</option>
                  <option>Nectera Holdings</option>
                  <option>Xtract Environmental Services</option>
                  <option>Bug Control Specialist</option>
                  <option>Lush Green Landscapes</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={lightTaskForm.notes} onChange={e => setLightTaskForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => { setShowLightTaskModal(false); setEditingLightTask(null); setLightTaskForm({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', company: '', status: 'Not Started', notes: '' }) }} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button onClick={() => saveLightTask(lightTaskForm)} disabled={!lightTaskForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: '0.85rem', fontWeight: '500', opacity: !lightTaskForm.name ? 0.5 : 1 }}>
                  {editingLightTask !== null ? 'Save Changes' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLightTaskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', width: '480px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{editingLightTask !== null ? 'Edit Task' : 'Add Task'}</h2>
              <button onClick={() => { setShowLightTaskModal(false); setEditingLightTask(null); setLightTaskForm({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', company: '', status: 'Not Started', notes: '' }) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Task Name *</label>
                <input value={lightTaskForm.name} onChange={e => setLightTaskForm(f => ({ ...f, name: e.target.value }))} placeholder="What needs to be done?" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Assigned To</label>
                  <input value={lightTaskForm.assignedTo} onChange={e => setLightTaskForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Name..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Due Date</label>
                  <input type="date" value={lightTaskForm.dueDate} onChange={e => setLightTaskForm(f => ({ ...f, dueDate: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select value={lightTaskForm.priority} onChange={e => setLightTaskForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={lightTaskForm.status} onChange={e => setLightTaskForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Blocked</option>
                    <option>Complete</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Company</label>
                <select value={lightTaskForm.company} onChange={e => setLightTaskForm(f => ({ ...f, company: e.target.value }))} style={inputStyle}>
                  <option value="">All Companies</option>
                  <option>Nectera Holdings</option>
                  <option>Xtract Environmental Services</option>
                  <option>Bug Control Specialist</option>
                  <option>Lush Green Landscapes</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={lightTaskForm.notes} onChange={e => setLightTaskForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => { setShowLightTaskModal(false); setEditingLightTask(null); setLightTaskForm({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', company: '', status: 'Not Started', notes: '' }) }} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button onClick={() => saveLightTask(lightTaskForm)} disabled={!lightTaskForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: '0.85rem', fontWeight: '500', opacity: !lightTaskForm.name ? 0.5 : 1 }}>
                  {editingLightTask !== null ? 'Save Changes' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.75rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Delete Task?</h3>
            <p style={{ color: '#8a8070', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              "{confirmDelete.name}" will be permanently removed from the spreadsheet. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#b85c38', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {reportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', width: '700px', maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e0d8cc' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1rem' }}>{reportData ? reportData.title : '...'}</div>
                <div style={{ fontSize: '0.75rem', color: '#8a8070' }}>{reportData ? reportData.company : ''} · {selectedYear}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {reportData && <button onClick={exportReportPDF} style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.75rem', cursor: 'pointer', color: '#3a3530', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{display:"block",flexShrink:0}}><rect x="2" y="1" width="9" height="12" rx="1.5" fill="#6b6560" opacity="0.7"/><rect x="4" y="1" width="9" height="12" rx="1.5" fill="#6b6560"/><rect x="9" y="1" width="4" height="4" rx="0" fill="#3a3530" opacity="0.4"/><rect x="6" y="7" width="5" height="1" rx="0.5" fill="#f4f0e8" opacity="0.9"/><rect x="6" y="9.5" width="3" height="1" rx="0.5" fill="#f4f0e8" opacity="0.6"/><circle cx="12" cy="12" r="3.5" fill="#c9a84c"/><path d="M12 10.5 L12 13.5 M10.5 12 L13.5 12" stroke="#0f0e0d" strokeWidth="1.2" strokeLinecap="round"/></svg></button>}
                <button onClick={() => { setReportModal(null); setReportData(null) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '1rem 1.5rem' }}>
              {loadingReport && <p style={{ color: '#8a8070', textAlign: 'center', padding: '2rem' }}>Loading report...</p>}
              {reportData && reportData.rows && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  {reportData.rows.map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.5rem',
                      paddingLeft: (0.5 + (row.depth || 0) * 1.25) + 'rem',
                      borderRadius: '3px',
                      background: row.isHeader ? '#f5f1ea' : row.isTotal ? '#f0ece0' : 'transparent',
                      fontWeight: row.isTotal || row.isHeader ? '600' : '400',
                      fontSize: row.isHeader ? '0.7rem' : '0.82rem',
                      textTransform: row.isHeader ? 'uppercase' : 'none',
                      letterSpacing: row.isHeader ? '0.06em' : 'normal',
                      borderTop: row.isTotal ? '1px solid #e0d8cc' : 'none',
                      gap: '1rem',
                    }}>
                      <span style={{ color: row.isHeader ? '#8a8070' : '#0f0e0d', flex: 1 }}>{row.label}</span>
                      {row.isAging && row.isTotal && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', fontWeight: '600', borderTop: '2px solid #0f0e0d', paddingTop: '0.3rem' }}>
                          <span style={{ color: '#4a6741', minWidth: '70px', textAlign: 'right' }}>${row.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#9a6a20', minWidth: '70px', textAlign: 'right' }}>${row.over30.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#b85c38', minWidth: '70px', textAlign: 'right' }}>${row.over60.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#b85c38', minWidth: '70px', textAlign: 'right' }}>${row.over90.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#8b0000', minWidth: '70px', textAlign: 'right' }}>${row.over91.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#0f0e0d', minWidth: '70px', textAlign: 'right' }}>${row.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {row.isAging && !row.colHeaders && !row.isTotal && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
                          <span style={{ color: '#4a6741', minWidth: '70px', textAlign: 'right' }}>{row.current > 0 ? '$' + row.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over30 > 0 ? '#9a6a20' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over30 > 0 ? '$' + row.over30.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over60 > 0 ? '#b85c38' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over60 > 0 ? '$' + row.over60.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over90 > 0 ? '#b85c38' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over90 > 0 ? '$' + row.over90.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over91 > 0 ? '#8b0000' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over91 > 0 ? '$' + row.over91.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: '#0f0e0d', fontWeight: '600', minWidth: '70px', textAlign: 'right' }}>${row.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {row.isAging && row.colHeaders && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.68rem', color: '#8a8070', fontWeight: '600' }}>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>Current</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>1-30</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>31-60</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>61-90</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>91+</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>Total</span>
                        </div>
                      )}
                      {!row.isAging && row.value !== null && <span style={{ color: row.value < 0 ? '#b85c38' : '#0f0e0d', fontVariantNumeric: 'tabular-nums' }}>{row.value < 0 ? '-$' : '$'}{Math.abs(row.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f4f0e8', overflow: 'hidden' }}>
        {!isMobile && (
          <div style={{ padding: '0.75rem 2rem', borderBottom: '1px solid #e8e2d9', background: '#f4f0e8', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button onClick={() => { setPage('messages'); setDrilldown(null) }} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="2" width="16" height="11" rx="2.5" fill="#6b6560" opacity="0.8"/><path d="M4 14 L3 17 L8 14" fill="#3a3530"/><rect x="4" y="6" width="5" height="1.5" rx="0.75" fill="#3a3530" opacity="0.9"/><rect x="4" y="9" width="8" height="1.5" rx="0.75" fill="#3a3530" opacity="0.6"/></svg>
              {unreadMessages > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#b85c38', color: 'white', borderRadius: '50%', width: '15px', height: '15px', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>{unreadMessages}</span>}
            </button>
            <button onClick={() => setShowNotifications(!showNotifications)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5 C6 1.5 4 3.5 4 6.5 L4 10 L2.5 12 L15.5 12 L14 10 L14 6.5 C14 3.5 12 1.5 9 1.5Z" fill="#6b6560" opacity="0.7"/><path d="M4 10 L2.5 12 L15.5 12 L14 10Z" fill="#3a3530" opacity="0.9"/><rect x="7" y="12" width="4" height="2.5" rx="1.25" fill="#6b6560" opacity="0.6"/><circle cx="13.5" cy="4.5" r="2.5" fill="#c9a84c"/></svg>
              {(notifications.length + taskNotifications.length + notesNotifications.length) > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#b85c38', color: 'white', borderRadius: '50%', width: '15px', height: '15px', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>{notifications.length + taskNotifications.length + notesNotifications.length}</span>}
            </button>
            {currentUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem', paddingLeft: '0.75rem', borderLeft: '1px solid #e8e2d9' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0f0e0d', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '700' }}>{currentUser.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</div>
                <span style={{ fontSize: '0.82rem', color: '#3a3530' }}>{currentUser.name}</span>
                <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #e0d8cc', borderRadius: '6px', color: '#8a8070', fontSize: '0.72rem', cursor: 'pointer', padding: '0.2rem 0.5rem', marginLeft: '0.25rem' }}>Sign out</button>
              </div>
            )}
          </div>
        )}
        <div style={{ flex: 1, padding: isMobile ? '4.5rem 1rem 1rem 1rem' : '2rem', overflowY: 'auto', paddingBottom: isMobile ? '1rem' : '2rem' }}>

        {drilldown && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button onClick={() => { setDrilldown(null); setDrilldownData(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8070', fontSize: '0.85rem', padding: 0 }}>
                Back
              </button>
              <h1 style={{ fontSize: isMobile ? '1.3rem' : '1.8rem', margin: 0 }}>{drilldownData?.company || '...'}</h1>
              <select value={selectedYear} onChange={async e => { const y = e.target.value; setSelectedYear(y); setDrilldownData(null); setLoadingDrilldown(true); const res = await fetch("/api/qb/details?company=" + drilldown + "&year=" + y); const d = await res.json(); setDrilldownData(d); setLoadingDrilldown(false); }} style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.85rem', cursor: 'pointer' }}><option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option></select>
            </div>
            {loadingDrilldown ? <p style={{ color: '#8a8070' }}>Loading details...</p> : drilldownData && (
              <>
                <div style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8070' }}>Trend</div>
                    {periodToggle}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={aggregateByPeriod(drilldownData.monthly, period)} barGap={4}>
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8a8070' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#8a8070' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="income" name="Revenue" fill="#4a6741" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#b85c38" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8070', marginBottom: '1rem' }}>P&L Breakdown (YTD)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    {drilldownData.rows.map((row, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.5rem', borderRadius: '4px', background: row.isTotal ? '#f5f1ea' : 'transparent', fontWeight: row.isTotal ? '600' : '400', fontSize: row.isTotal ? '0.85rem' : '0.82rem', paddingLeft: (0.5 + row.depth) + 'rem' }}>
                        <span style={{ color: row.isTotal ? '#0f0e0d' : '#3a3530' }}>{row.label}</span>
                        <span style={{ color: row.value < 0 ? '#b85c38' : '#0f0e0d' }}>{fmt(row.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {!drilldown && page === 'financials' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0, fontFamily: "'DM Serif Display', serif", fontWeight: '400' }}>Portfolio Overview</h1>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={exportFinancialsPDF} style={{ padding: '0.35rem 0.75rem', border: '1px solid #ede8df', borderRadius: '8px', background: 'white', fontSize: '0.8rem', cursor: 'pointer', color: '#3a3530', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{display:"block",flexShrink:0}}><rect x="2" y="1" width="9" height="12" rx="1.5" fill="#6b6560" opacity="0.7"/><rect x="4" y="1" width="9" height="12" rx="1.5" fill="#6b6560"/><rect x="9" y="1" width="4" height="4" rx="0" fill="#3a3530" opacity="0.4"/><rect x="6" y="7" width="5" height="1" rx="0.5" fill="#f4f0e8" opacity="0.9"/><rect x="6" y="9.5" width="3" height="1" rx="0.5" fill="#f4f0e8" opacity="0.6"/><circle cx="12" cy="12" r="3.5" fill="#c9a84c"/><path d="M12 10.5 L12 13.5 M10.5 12 L13.5 12" stroke="#0f0e0d" strokeWidth="1.2" strokeLinecap="round"/></svg></button>
                <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setDrilldown(null) }} style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
            </div>
            <p style={{ color: '#8a8070', marginBottom: '1.5rem', fontSize: '0.85rem' }}>{selectedYear} · Live from QuickBooks</p>

            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8070', marginBottom: '1rem' }}>Consolidated</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Revenue', value: totalIncome, color: '#4a6741' },
                { label: 'Total Expenses', value: totalExpenses, color: '#b85c38' },
                { label: 'Net Income', value: totalNet, color: totalNet >= 0 ? '#3d5a6e' : '#b85c38' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1rem', borderTop: '3px solid ' + color }}>
                  <div style={{ fontSize: '0.7rem', color: '#8a8070', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: isMobile ? '1.4rem' : '2rem', fontWeight: '600', color: value < 0 ? '#b85c38' : '#0f0e0d', fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.01em' }}>{loadingFinancials ? '-' : fmt(value)}</div>
                </div>
              ))}
            </div>

            {!loadingFinancials && chartData.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8070', marginBottom: '1rem' }}>Revenue vs Expenses</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} barGap={4}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8a8070' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#8a8070' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Revenue" fill="#4a6741" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#b85c38" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4a6741', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <div style={{ width: 10, height: 10, background: '#4a6741', borderRadius: 2 }} /> Revenue
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#b85c38', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <div style={{ width: 10, height: 10, background: '#b85c38', borderRadius: 2 }} /> Expenses
                    </div>
                  </div>
                </div>
                <div style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8070', marginBottom: '1rem' }}>Net Income by Subsidiary</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8a8070' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#8a8070' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Net Income" radius={[3, 3, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={entry['Net Income'] >= 0 ? '#3d5a6e' : '#b85c38'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8070', marginBottom: '1rem' }}>Subsidiaries</h2>
            {loadingFinancials ? <p style={{ color: '#8a8070' }}>Loading...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.map((sub) => {
                  const income = getMetric(sub.report, 'Total Income')
                  const expenses = getTotalExpenses(sub.report)
                  const gross = getMetric(sub.report, 'Gross Profit')
                  const net = getMetric(sub.report, 'Net Income')
                  const margin = income > 0 ? ((net / income) * 100).toFixed(1) : '0.0'
                  const marginPct = Math.min(Math.max(parseFloat(margin), 0), 30) / 30 * 100
                  return (
                    <div key={sub.name} onClick={() => companyKeys[sub.name] && openDrilldown(companyKeys[sub.name])} style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem', cursor: companyKeys[sub.name] ? 'pointer' : 'default' }} onMouseEnter={e => companyKeys[sub.name] && (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{sub.name}</h3>
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: net >= 0 ? '#e8f0e8' : '#fdf3e0', color: net >= 0 ? '#4a6741' : '#9a6a20' }}>
                          {net >= 0 ? 'Profitable' : 'Loss'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '0.75rem' }}>
                        {[{ label: 'Revenue', value: income }, { label: 'Gross Profit', value: gross }, { label: 'Expenses', value: expenses }, { label: 'Net Income', value: net }].map(({ label, value }) => (
                          <div key={label}>
                            <div style={{ fontSize: '0.6rem', color: '#8a8070', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{label}</div>
                            <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: '600', color: value < 0 ? '#b85c38' : '#0f0e0d' }}>{fmt(value)}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f0ece0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8a8070', marginBottom: '0.3rem' }}>
                          <span>Net margin</span>
                          <strong style={{ color: parseFloat(margin) < 0 ? '#b85c38' : '#4a6741' }}>{margin}%</strong>
                        </div>
                        <div style={{ background: '#f0ece0', borderRadius: '4px', height: '8px', position: 'relative', overflow: 'visible' }}>
                          <div style={{ width: marginPct + '%', height: '100%', background: parseFloat(margin) < 0 ? '#b85c38' : parseFloat(margin) >= 15 ? '#4a6741' : '#c9a84c', borderRadius: '4px' }} />
                          <div style={{ position: 'absolute', top: '-4px', left: '50%', width: '3px', height: '16px', background: '#333', borderRadius: '2px', zIndex: 2 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#8a8070', marginTop: '0.3rem' }}>
                          <span style={{ color: parseFloat(margin) >= 15 ? '#4a6741' : '#c9a84c' }}>{parseFloat(margin) >= 15 ? 'Goal reached' : 'Below goal'}</span>
                          <span>Goal: 15%</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        {[['pl', 'P&L'], ['balance', 'Balance Sheet'], ['ar', 'A/R Aging'], ['ap', 'A/P Aging']].map(([type, label]) => (
                          <button key={type} onClick={e => { e.stopPropagation(); openReport(companyKeys[sub.name], type) }} style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.7rem', cursor: 'pointer', color: '#3a3530' }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {!drilldown && page === 'projects' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0 }}>Projects</h1>
              <button onClick={() => setShowModal(true)} style={{ padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '500' }}>
                + Project
              </button>
            </div>
            <p style={{ color: '#8a8070', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              {activeTasks.length} active · {tasks.length} total
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #ede8df', borderRadius: '8px', background: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>
                {companies.map(c => <option key={c} value={c}>{isMobile ? (c === 'all' ? 'All' : companyLabels[c].split(' ')[0]) : companyLabels[c]}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #ede8df', borderRadius: '8px', background: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>
                {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
              </select>
              <span style={{ fontSize: '0.8rem', color: '#8a8070', alignSelf: 'center' }}>{filteredTasks.length} tasks</span>
            </div>

            {loadingTasks ? <p style={{ color: '#8a8070' }}>Loading tasks...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {filteredTasks.map((task, i) => {
                  const sc = statusColor(task.status)
                  const pc = priorityColor(task.priority)
                  const isExpanded = expandedTask === i
                  return (
                    <div key={i} style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: isMobile ? '0.75rem 1rem' : '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div onClick={() => setExpandedTask(isExpanded ? null : i)} style={{ fontWeight: '500', marginBottom: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: isMobile ? '0.85rem' : '0.95rem' }}>
                            <span style={{ fontSize: '0.65rem', color: '#8a8070', flexShrink: 0 }}>{isExpanded ? 'v' : '>'}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'nowrap' : 'normal' }}>{task.name}</span>
                          </div>
                          {task.dueDate && <div style={{ fontSize: '0.7rem', color: '#8a8070' }}>Due: {task.dueDate}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                          {!isMobile && (
                            <select value={task.priority} onChange={e => handleEdit(task, 'priority', e.target.value)} style={selectStyle(pc)}>
                              <option value="">No priority</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          )}
                          <select value={task.status} onChange={e => handleEdit(task, 'status', e.target.value)} style={selectStyle(sc)}>
                            <option value="">No status</option>
                            <option value="Planning">Planning</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Complete">Complete</option>
                          </select>
                          {!isMobile && (
                            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '20px', background: '#f0ece0', color: '#8a8070' }}>
                              {task.company?.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f0ece0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#8a8070', marginBottom: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {task.lead && <span>Lead: {task.lead}</span>}
                            {task.teamMembers && <span>Team: {task.teamMembers}</span>}
                            {task.dueDate && <span>Due: {task.dueDate}</span>}
                            {task.notes && <span style={{ color: '#6b6560', fontStyle: 'italic' }}>{task.notes}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setActiveCommentProject(task); setCommentPanel(true); loadComments(task) }} style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.75rem', cursor: 'pointer', color: '#3a3530', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="9" rx="2" fill="#6b6560" opacity="0.7"/><path d="M3 13 L3 10 L7 10" fill="#6b6560" opacity="0.5"/><rect x="3" y="4" width="4" height="1.2" rx="0.6" fill="#f4f0e8"/><rect x="3" y="6.5" width="7" height="1.2" rx="0.6" fill="#f4f0e8" opacity="0.7"/></svg>
                              Discussion
                            </button>
                            <button onClick={() => setConfirmDelete(task)} style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid #fde8e8', background: '#fde8e8', fontSize: '0.75rem', cursor: 'pointer', color: '#b85c38' }}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.75rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Delete Task?</h3>
            <p style={{ color: '#8a8070', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              "{confirmDelete.name}" will be permanently removed from the spreadsheet. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#b85c38', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {reportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', width: '700px', maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e0d8cc' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1rem' }}>{reportData ? reportData.title : '...'}</div>
                <div style={{ fontSize: '0.75rem', color: '#8a8070' }}>{reportData ? reportData.company : ''} · {selectedYear}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {reportData && <button onClick={exportReportPDF} style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.75rem', cursor: 'pointer', color: '#3a3530', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{display:"block",flexShrink:0}}><rect x="2" y="1" width="9" height="12" rx="1.5" fill="#6b6560" opacity="0.7"/><rect x="4" y="1" width="9" height="12" rx="1.5" fill="#6b6560"/><rect x="9" y="1" width="4" height="4" rx="0" fill="#3a3530" opacity="0.4"/><rect x="6" y="7" width="5" height="1" rx="0.5" fill="#f4f0e8" opacity="0.9"/><rect x="6" y="9.5" width="3" height="1" rx="0.5" fill="#f4f0e8" opacity="0.6"/><circle cx="12" cy="12" r="3.5" fill="#c9a84c"/><path d="M12 10.5 L12 13.5 M10.5 12 L13.5 12" stroke="#0f0e0d" strokeWidth="1.2" strokeLinecap="round"/></svg></button>}
                <button onClick={() => { setReportModal(null); setReportData(null) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '1rem 1.5rem' }}>
              {loadingReport && <p style={{ color: '#8a8070', textAlign: 'center', padding: '2rem' }}>Loading report...</p>}
              {reportData && reportData.rows && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  {reportData.rows.map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.5rem',
                      paddingLeft: (0.5 + (row.depth || 0) * 1.25) + 'rem',
                      borderRadius: '3px',
                      background: row.isHeader ? '#f5f1ea' : row.isTotal ? '#f0ece0' : 'transparent',
                      fontWeight: row.isTotal || row.isHeader ? '600' : '400',
                      fontSize: row.isHeader ? '0.7rem' : '0.82rem',
                      textTransform: row.isHeader ? 'uppercase' : 'none',
                      letterSpacing: row.isHeader ? '0.06em' : 'normal',
                      borderTop: row.isTotal ? '1px solid #e0d8cc' : 'none',
                      gap: '1rem',
                    }}>
                      <span style={{ color: row.isHeader ? '#8a8070' : '#0f0e0d', flex: 1 }}>{row.label}</span>
                      {row.isAging && row.isTotal && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', fontWeight: '600', borderTop: '2px solid #0f0e0d', paddingTop: '0.3rem' }}>
                          <span style={{ color: '#4a6741', minWidth: '70px', textAlign: 'right' }}>${row.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#9a6a20', minWidth: '70px', textAlign: 'right' }}>${row.over30.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#b85c38', minWidth: '70px', textAlign: 'right' }}>${row.over60.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#b85c38', minWidth: '70px', textAlign: 'right' }}>${row.over90.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#8b0000', minWidth: '70px', textAlign: 'right' }}>${row.over91.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#0f0e0d', minWidth: '70px', textAlign: 'right' }}>${row.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {row.isAging && !row.colHeaders && !row.isTotal && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
                          <span style={{ color: '#4a6741', minWidth: '70px', textAlign: 'right' }}>{row.current > 0 ? '$' + row.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over30 > 0 ? '#9a6a20' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over30 > 0 ? '$' + row.over30.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over60 > 0 ? '#b85c38' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over60 > 0 ? '$' + row.over60.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over90 > 0 ? '#b85c38' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over90 > 0 ? '$' + row.over90.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over91 > 0 ? '#8b0000' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over91 > 0 ? '$' + row.over91.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: '#0f0e0d', fontWeight: '600', minWidth: '70px', textAlign: 'right' }}>${row.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {row.isAging && row.colHeaders && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.68rem', color: '#8a8070', fontWeight: '600' }}>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>Current</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>1-30</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>31-60</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>61-90</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>91+</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>Total</span>
                        </div>
                      )}
                      {!row.isAging && row.value !== null && <span style={{ color: row.value < 0 ? '#b85c38' : '#0f0e0d', fontVariantNumeric: 'tabular-nums' }}>{row.value < 0 ? '-$' : '$'}{Math.abs(row.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


        

        {!drilldown && page === 'tasks' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0 }}>Tasks</h1>
              <button onClick={() => { setLightTaskForm({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', company: '', status: 'Not Started', notes: '' }); setEditingLightTask(null); setShowLightTaskModal(true) }} style={{ padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '500' }}>
                + Task
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {['all', 'Not Started', 'In Progress', 'Blocked', 'Complete'].map(f => (
                <button key={f} onClick={() => setLightTaskFilter(f)} style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid #e0d8cc', background: lightTaskFilter === f ? '#0f0e0d' : 'white', color: lightTaskFilter === f ? 'white' : '#3a3530', fontSize: '0.75rem', cursor: 'pointer' }}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
            {lightTasks.length === 0 && (
              <div style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '3rem', textAlign: 'center', color: '#8a8070' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>No tasks yet</div>
                <div style={{ fontSize: '0.8rem' }}>Click "+ Task" to get started</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {lightTasks.filter(t => lightTaskFilter === 'all' || t.status === lightTaskFilter).map((task, idx) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Complete'
                const priorityColor = task.priority === 'High' ? '#b85c38' : task.priority === 'Medium' ? '#9a6a20' : '#4a6741'
                return (
                  <div key={idx} style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: task.status === 'Complete' ? '#8a8070' : '#0f0e0d', textDecoration: task.status === 'Complete' ? 'line-through' : 'none' }}>{task.name}</span>
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '20px', background: '#f0ece0', color: priorityColor, fontWeight: '600' }}>{task.priority}</span>
                          {isOverdue && <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '20px', background: '#fde8e8', color: '#b85c38', fontWeight: '600' }}>Overdue</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#8a8070', flexWrap: 'wrap' }}>
                          {task.assignedTo && <span>👤 {task.assignedTo}</span>}
                          {task.dueDate && <span style={{ color: isOverdue ? '#b85c38' : '#8a8070' }}>📅 {task.dueDate}</span>}
                          {task.company && <span>🏢 {task.company.split(' ')[0]}</span>}
                          <span style={{ padding: '0.05rem 0.4rem', borderRadius: '20px', background: task.status === 'Complete' ? '#e8f0e8' : task.status === 'Blocked' ? '#fde8e8' : task.status === 'In Progress' ? '#fdf3e0' : '#f0ece0', color: task.status === 'Complete' ? '#4a6741' : task.status === 'Blocked' ? '#b85c38' : task.status === 'In Progress' ? '#9a6a20' : '#8a8070' }}>{task.status}</span>
                        </div>
                        {task.notes && <div style={{ fontSize: '0.78rem', color: '#8a8070', marginTop: '0.4rem', fontStyle: 'italic' }}>{task.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        <button onClick={() => { setLightTaskForm(task); setEditingLightTask(idx); setShowLightTaskModal(true) }} style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.7rem', cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => deleteLightTask(idx)} style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #fde8e8', background: '#fde8e8', fontSize: '0.7rem', cursor: 'pointer', color: '#b85c38' }}>✕</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {!drilldown && page === 'notes' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0 }}>Notes</h1>
              <button onClick={() => {
                const newNote = { id: Date.now(), title: 'Untitled', content: '', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), pinned: false }
                const updated = { ...notes, [selectedNoteCompany]: [newNote, ...(notes[selectedNoteCompany] || [])] }
                setNotes(updated)
                setSelectedNoteId(newNote.id)
                setNoteEditTitle('')
                setNoteEditContent('')
                fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: selectedNoteCompany, notes: updated[selectedNoteCompany] }) }).catch(() => {})
              }} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: '0.85rem', fontWeight: '500' }}>+ Note</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {['Nectera Holdings', 'Xtract Environmental Services', 'Bug Control Specialist', 'Lush Green Landscapes'].map(co => (
                <button key={co} onClick={() => { setSelectedNoteCompany(co); setSelectedNoteId(null); setNoteEditTitle(''); setNoteEditContent('') }} style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid #e0d8cc', background: selectedNoteCompany === co ? '#0f0e0d' : 'white', color: selectedNoteCompany === co ? 'white' : '#3a3530', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {co.split(' ')[0]}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', height: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 220px)', flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ width: isMobile ? '100%' : '240px', flexShrink: 0, overflowY: 'auto', display: isMobile && selectedNote ? 'none' : 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentNotes.length === 0 && <div style={{ color: '#8a8070', fontSize: '0.8rem', padding: '1rem 0', textAlign: 'center' }}>No notes yet.<br/>Click '+ Note'</div>}
                {currentNotes.map(note => (
                  <div key={note.id} onClick={() => { setSelectedNoteId(note.id); setNoteEditTitle(note.title); setNoteEditContent(note.content) }} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid', borderColor: selectedNoteId === note.id ? '#c9a84c' : '#e0d8cc', background: selectedNoteId === note.id ? '#fdfaf5' : 'white', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                      {note.pinned && <span style={{ fontSize: '0.65rem' }}>📌</span>}
                      <span style={{ fontWeight: '600', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{note.title || 'Untitled'}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8a8070' }}>{note.date}</div>
                    <div style={{ fontSize: '0.72rem', color: '#8a8070', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(note.content || '').slice(0, 60) || 'Empty note'}</div>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: isMobile && !selectedNote ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!selectedNote && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8070', fontSize: '0.9rem' }}>Select or create a note</div>}
                {selectedNote && (
                  <>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f0ece0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {isMobile && <button onClick={() => { setSelectedNoteId(null); setNoteEditTitle(''); setNoteEditContent('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8070', fontSize: '0.82rem', padding: '0 0.6rem 0 0', flexShrink: 0 }}>← Back</button>}
                      <input value={noteEditTitle} onChange={e => setNoteEditTitle(e.target.value)} onBlur={() => saveNote(selectedNoteCompany, selectedNote.id, noteEditTitle, noteEditContent)} placeholder='Note title...' style={{ border: 'none', outline: 'none', fontSize: '1rem', fontWeight: '600', flex: 1, background: 'transparent' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => togglePinNote(selectedNoteCompany, selectedNote.id)} title={selectedNote.pinned ? 'Unpin' : 'Pin'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: selectedNote.pinned ? 1 : 0.4 }}>📌</button>
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => setShowTagMenu(!showTagMenu)} style={{ background: 'none', border: '1px solid #e0d8cc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', color: '#3a3530', padding: '0.2rem 0.5rem' }}>@ Notify</button>
                          {showTagMenu && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '220px', marginTop: '4px' }}>
                              <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.68rem', color: '#8a8070', borderBottom: '1px solid #f0ece0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notify user</div>
                              {userList.length === 0 && <div style={{ padding: '0.75rem', fontSize: '0.78rem', color: '#8a8070' }}>No users found — click Refresh in Settings</div>}
                              {userList.filter(u => u.email && u.id !== currentUser?.id).map((u, idx) => (
                                <div key={idx} onClick={async () => {
                                  setShowTagMenu(false)
                                  setNotifySending(true)
                                  setNotifySuccess(null)
                                  const res = await fetch('/api/notify', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      toEmail: u.email,
                                      toName: u.name,
                                      fromName: currentUser?.name || 'A team member',
                                      noteTitle: noteEditTitle || selectedNote.title,
                                      noteContent: noteEditContent || selectedNote.content,
                                      company: selectedNoteCompany,
                                    })
                                  })
                                  const d = await res.json()
                                  setNotifySending(false)
                                  setNotifySuccess(d.success ? u.name : 'Failed')
                                  setTimeout(() => setNotifySuccess(null), 3000)
                                }} style={{ padding: '0.6rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#f5f1ea'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0f0e0d', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '600', flexShrink: 0 }}>{u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                                  <div>
                                    <div style={{ fontWeight: '500' }}>{u.name}</div>
                                    <div style={{ fontSize: '0.68rem', color: '#8a8070' }}>{u.email}</div>
                                  </div>
                                </div>
                              ))}
                              {userList.filter(u => u.email && u.id !== currentUser?.id).length === 0 && userList.length > 0 && <div style={{ padding: '0.75rem', fontSize: '0.78rem', color: '#8a8070' }}>No other users have emails</div>}
                            </div>
                          )}
                        </div>
                        {notifySending && <span style={{ fontSize: '0.7rem', color: '#8a8070' }}>Sending...</span>}
                        {notifySuccess && <span style={{ fontSize: '0.7rem', color: notifySuccess === 'Failed' ? '#b85c38' : '#4a6741', fontWeight: '500' }}>{notifySuccess === 'Failed' ? 'Failed to send' : 'Notified ' + notifySuccess}</span>}
                        <button onClick={() => saveNote(selectedNoteCompany, selectedNote.id, noteEditTitle, noteEditContent)} style={{ background: 'none', border: '1px solid #e0d8cc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', color: '#4a6741', padding: '0.2rem 0.5rem' }}>Save</button>
                        <button onClick={() => deleteNote(selectedNoteCompany, selectedNote.id)} style={{ background: 'none', border: '1px solid #fde8e8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', color: '#b85c38', padding: '0.2rem 0.5rem' }}>Delete</button>
                      </div>
                    </div>
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.68rem', color: '#8a8070', borderBottom: '1px solid #f5f1ea' }}>{selectedNote.date} · {selectedNoteCompany}</div>
                    <textarea value={noteEditContent} onChange={e => setNoteEditContent(e.target.value)} onBlur={() => saveNote(selectedNoteCompany, selectedNote.id, noteEditTitle, noteEditContent)} placeholder='Start writing...' style={{ flex: 1, padding: '1rem', border: 'none', outline: 'none', fontSize: '0.88rem', lineHeight: '1.6', resize: 'none', color: '#3a3530', background: 'transparent', fontFamily: 'inherit', minHeight: '120px' }} />
                    <div style={{ borderTop: '1px solid #f0ece0', padding: '0.75rem 1rem', background: '#fefcf8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#8a8070', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Attachments ({(selectedNote.attachments || []).length})</div>
                        <label style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', color: '#3a3530' }}>
                          {uploadingFile ? 'Uploading...' : '+ Attach File'}
                          <input type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadFile(selectedNoteCompany, selectedNote.id, e.target.files[0]); e.target.value = '' }} />
                        </label>
                      </div>
                      {(selectedNote.attachments || []).length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                          {(selectedNote.attachments || []).map((att, i) => {
                            const isImage = att.type?.startsWith('image/')
                            const isPDF = att.type === 'application/pdf'
                            const icon = isImage ? '🖼️' : isPDF ? '📄' : '📎'
                            const sizeKB = att.size ? (att.size / 1024).toFixed(0) + ' KB' : ''
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: 'white', border: '1px solid #e0d8cc', borderRadius: '4px' }}>
                                <span style={{ fontSize: '0.85rem' }}>{icon}</span>
                                <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: '0.78rem', color: '#3d5a6e', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</a>
                                <span style={{ fontSize: '0.65rem', color: '#8a8070', flexShrink: 0 }}>{sizeKB}</span>
                                <button onClick={() => removeAttachment(selectedNoteCompany, selectedNote.id, att.url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '0.7rem', padding: 0, flexShrink: 0 }}>✕</button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid #f0ece0', padding: '0.75rem 1rem', background: '#fefcf8' }}>
                      <div style={{ fontSize: '0.7rem', color: '#8a8070', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Comments ({(selectedNote.comments || []).length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                        {(selectedNote.comments || []).length === 0 && <div style={{ fontSize: '0.78rem', color: '#ccc', fontStyle: 'italic' }}>No comments yet</div>}
                        {(selectedNote.comments || []).map(c => (
                          <div key={c.id} style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '0.5rem 0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0f0e0d', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: '600' }}>{c.author.slice(0,2).toUpperCase()}</div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0f0e0d' }}>{c.author}</span>
                                <span style={{ fontSize: '0.65rem', color: '#8a8070' }}>{c.date}</span>
                              </div>
                              <button onClick={() => deleteComment(selectedNoteCompany, selectedNote.id, c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '0.7rem', padding: 0 }}>x</button>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#3a3530', lineHeight: '1.5' }}>{c.text}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {!currentUser && <input value={commenterName} onChange={e => setCommenterName(e.target.value)} placeholder='Your name...' style={{ border: '1px solid #e0d8cc', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.72rem', outline: 'none', color: '#3a3530' }} />}
                          <textarea value={projectCommentText} onChange={e => setProjectCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(selectedNoteCompany, selectedNote.id) } }} placeholder='Add a comment... (Enter to send)' style={{ border: '1px solid #e0d8cc', borderRadius: '4px', padding: '0.4rem 0.5rem', fontSize: '0.82rem', outline: 'none', resize: 'none', minHeight: '50px', color: '#3a3530', fontFamily: 'inherit' }} />
                        </div>
                        <button onClick={() => addComment(selectedNoteCompany, selectedNote.id)} disabled={!projectCommentText.trim()} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: '0.78rem', fontWeight: '500', opacity: !projectCommentText.trim() ? 0.4 : 1, alignSelf: 'flex-end' }}>Send</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {!drilldown && page === 'calendar' && (() => {
          const year = calendarDate.getFullYear()
          const month = calendarDate.getMonth()
          const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          const firstDay = new Date(year, month, 1).getDay()
          const daysInMonth = new Date(year, month + 1, 0).getDate()
          const today = new Date()

          // Gather all events from tasks and projects
          const events = {}
          const addEvent = (dateStr, label, color, id) => {
            if (!dateStr) return
            const d = dateStr.split('T')[0]
            if (!events[d]) events[d] = []
            events[d].push({ label, color, id })
          }

          // Calendar events
          calendarEvents.forEach(e => {
            if (e.date) addEvent(e.date, e.title, '#7a5c3e', e.id)
          })

          // Lightweight tasks
          lightTasks.forEach(t => {
            if (t.dueDate) addEvent(t.dueDate, t.name, '#3d5a6e')
          })

          // Google Sheets projects
          tasks.forEach(t => {
            if (t.dueDate) {
              // Convert MM/DD/YYYY to YYYY-MM-DD if needed
              let d = t.dueDate
              if (d.includes('/')) {
                const parts = d.split('/')
                if (parts.length === 3) d = parts[2] + '-' + parts[0].padStart(2,'0') + '-' + parts[1].padStart(2,'0')
              }
              addEvent(d, t.name, '#4a6741')
            }
          })

          const selectedDateStr = calendarSelected ? calendarSelected.toISOString().split('T')[0] : null
          const selectedEvents = selectedDateStr ? (events[selectedDateStr] || []) : []

          const cells = []
          for (let i = 0; i < firstDay; i++) cells.push(null)
          for (let d = 1; d <= daysInMonth; d++) cells.push(d)

          return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0 }}>Calendar</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #ede8df', background: 'white', cursor: 'pointer', fontSize: '0.9rem' }}>‹</button>
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', minWidth: isMobile ? '110px' : '140px', textAlign: 'center' }}>{monthName}</span>
                  <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #ede8df', background: 'white', cursor: 'pointer', fontSize: '0.9rem' }}>›</button>
                  <button onClick={() => setCalendarDate(new Date())} style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #ede8df', background: 'white', cursor: 'pointer', fontSize: '0.78rem', color: '#8a8070' }}>Today</button>
                  <button onClick={() => { setCalendarForm({ title: '', date: calendarSelected ? calendarSelected.toISOString().split('T')[0] : '', time: '', company: '', notes: '', assignedTo: '' }); setShowCalendarModal(true) }} style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500' }}>{isMobile ? '+' : '+ Event'}</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: '1.25rem', flex: 1 }}>
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.5rem' }}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#8a8070', padding: '0.4rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                    {cells.map((day, i) => {
                      if (!day) return <div key={'empty-' + i} />
                      const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
                      const dayEvents = events[dateStr] || []
                      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
                      const isSelected = calendarSelected && calendarSelected.getDate() === day && calendarSelected.getMonth() === month && calendarSelected.getFullYear() === year
                      return (
                        <div key={day} onClick={() => setCalendarSelected(new Date(year, month, day))} style={{ height: isMobile ? '70px' : '110px', overflow: 'hidden', padding: '0.4rem', borderRadius: '10px', background: isSelected ? '#0f0e0d' : isToday ? '#fef9f0' : 'white', border: isToday ? '1.5px solid #c9a84c' : '1px solid #f0ece4', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: isToday ? '700' : '500', color: isSelected ? '#c9a84c' : isToday ? '#c9a84c' : '#3a3530', marginBottom: '0.25rem' }}>{day}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {dayEvents.slice(0, 3).map((ev, j) => (
                              <div key={j} title={ev.label} style={{ fontSize: '0.6rem', background: ev.color, color: 'white', borderRadius: '3px', padding: '1px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', cursor: 'default' }}>{ev.label}</div>
                            ))}
                            {dayEvents.length > 3 && <div style={{ fontSize: '0.58rem', color: '#8a8070' }}>+{dayEvents.length - 3} more</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', padding: '1.25rem', alignSelf: 'start' }}>
                  {!calendarSelected ? (
                    <div style={{ textAlign: 'center', color: '#8a8070', fontSize: '0.85rem', padding: '2rem 0' }}>Click a day to see events</div>
                  ) : (
                    <>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '1rem', color: '#0f0e0d' }}>{calendarSelected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                      {selectedEvents.length === 0 ? (
                        <div style={{ color: '#8a8070', fontSize: '0.82rem' }}>No events this day</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {selectedEvents.map((ev, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#f4f0e8' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                              <div style={{ fontSize: '0.82rem', color: '#3a3530', flex: 1 }}>{ev.label}</div>
                              {ev.id && <button onClick={async () => {
                                await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: ev.id }) })
                                setCalendarEvents(prev => prev.filter(e => e.id !== ev.id))
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b85c38', fontSize: '0.75rem', padding: '0 0.2rem', flexShrink: 0 }}>✕</button>}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {commentPanel && activeCommentProject && (
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: isMobile ? '100%' : '420px', background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e8e2d9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#0f0e0d', color: '#f5f1ea' }}>
              <div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8070', marginBottom: '0.25rem' }}>{activeCommentProject.company}</div>
                <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{activeCommentProject.name}</div>
              </div>
              <button onClick={() => { setCommentPanel(false); setActiveCommentProject(null); setComments([]) }} style={{ background: 'none', border: 'none', color: '#8a8070', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            </div>
            {/* Comments list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {comments.length === 0 && (
                <div style={{ textAlign: 'center', color: '#a09880', fontSize: '0.82rem', marginTop: '2rem' }}>No comments yet — start the discussion!</div>
              )}
              {comments.map((c, i) => {
                const isMe = c.authorId === currentUser?.id
                const initials = c.author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const time = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={c.id} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#0f0e0d', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '600', flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#1a1814' }}>{c.author}</span>
                        <span style={{ fontSize: '0.65rem', color: '#a09880' }}>{time}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#3a3530', lineHeight: 1.5, background: '#f9f7f4', borderRadius: '8px', padding: '0.5rem 0.75rem', wordBreak: 'break-word' }}>{c.text}</div>
                      {/* Reactions */}
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {Object.entries(c.reactions || {}).map(([emoji, users]) => (
                          <button key={emoji} onClick={() => reactToProjectComment(c.id, emoji)} style={{ padding: '0.15rem 0.4rem', borderRadius: '20px', border: '1px solid #e8e2d9', background: users.includes(currentUser?.id) ? '#f0ece0' : 'white', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            {emoji} <span style={{ fontSize: '0.65rem', color: '#8a8070' }}>{users.length}</span>
                          </button>
                        ))}
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => setShowEmojiFor(showEmojiFor === c.id ? null : c.id)} style={{ padding: '0.15rem 0.4rem', borderRadius: '20px', border: '1px solid #e8e2d9', background: 'white', fontSize: '0.75rem', cursor: 'pointer', color: '#8a8070' }}>+😊</button>
                          {showEmojiFor === c.id && (
                            <div style={{ position: 'absolute', bottom: '100%', left: 0, background: 'white', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '0.5rem', display: 'flex', gap: '0.35rem', zIndex: 10, flexWrap: 'wrap', width: '160px' }}>
                              {['👍','👎','✅','❌','🔥','⚠️','💡','🎉'].map(e => (
                                <button key={e} onClick={() => reactToProjectComment(c.id, e)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '0.1rem' }}>{e}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        {isMe && <button onClick={() => deleteProjectComment(c.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b85c38', fontSize: '0.68rem', padding: '0.1rem 0.3rem' }}>delete</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Input */}
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e8e2d9', background: '#faf8f4' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <textarea
                  value={projectCommentText}
                  onChange={e => setProjectCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }}
                  placeholder="Write a comment... (Enter to send)"
                  style={{ flex: 1, padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #e0d8cc', fontSize: '0.82rem', resize: 'none', height: '70px', fontFamily: 'inherit', color: '#1a1814', background: 'white' }}
                />
                <button onClick={addProjectComment} disabled={!projectCommentText.trim()} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: projectCommentText.trim() ? 'pointer' : 'not-allowed', fontSize: '0.82rem', fontWeight: '500', opacity: projectCommentText.trim() ? 1 : 0.5, flexShrink: 0 }}>Send</button>
              </div>
            </div>
          </div>
        )}

        {showCalendarModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '1.5rem', width: '440px', maxWidth: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>New Event</h2>
                <button onClick={() => setShowCalendarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input value={calendarForm.title} onChange={e => setCalendarForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Date *</label>
                    <input type="date" value={calendarForm.date} onChange={e => setCalendarForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Time</label>
                    <input type="time" value={calendarForm.time} onChange={e => setCalendarForm(f => ({ ...f, time: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Company</label>
                  <select value={calendarForm.company} onChange={e => setCalendarForm(f => ({ ...f, company: e.target.value }))} style={inputStyle}>
                    <option value="">All Companies</option>
                    <option value="Nectera Holdings">Nectera Holdings</option>
                    <option value="Xtract Environmental Services">Xtract Environmental Services</option>
                    <option value="Bug Control Specialist">Bug Control Specialist</option>
                    <option value="Lush Green Landscapes">Lush Green Landscapes</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Assigned To</label>
                  <input value={calendarForm.assignedTo} onChange={e => setCalendarForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={calendarForm.notes} onChange={e => setCalendarForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" style={{ ...inputStyle, height: '70px', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowCalendarModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                  <button onClick={async () => {
                    if (!calendarForm.title || !calendarForm.date) return
                    const res = await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...calendarForm, createdBy: currentUser?.name || '' }) })
                    const saved = await res.json()
                    if (saved.event) setCalendarEvents(prev => [...prev, saved.event])
                    setShowCalendarModal(false)
                  }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>Save Event</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!drilldown && page === 'messages' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0 }}>Messages</h1>
              <button onClick={() => setShowNewConvo(true)} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: '0.85rem', fontWeight: '500' }}>+ New</button>
            </div>

            {showNewConvo && (
              <div style={{ background: 'white', border: 'none', borderRadius: '14px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', padding: '1.25rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>New Conversation</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button onClick={() => setNewConvoType('dm')} style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid #e0d8cc', background: newConvoType === 'dm' ? '#0f0e0d' : 'white', color: newConvoType === 'dm' ? 'white' : '#3a3530', cursor: 'pointer', fontSize: '0.8rem' }}>Direct Message</button>
                  <button onClick={() => setNewConvoType('group')} style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid #e0d8cc', background: newConvoType === 'group' ? '#0f0e0d' : 'white', color: newConvoType === 'group' ? 'white' : '#3a3530', cursor: 'pointer', fontSize: '0.8rem' }}>Group</button>
                </div>
                {newConvoType === 'group' && (
                  <input value={newConvoName} onChange={e => setNewConvoName(e.target.value)} placeholder="Group name..." style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #e0d8cc', fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box', outline: 'none' }} />
                )}
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#8a8070', margin: '0 0 0.4rem 0' }}>Select members:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {userList.filter(u => u.id !== currentUser?.id).map(u => (
                      <button key={u.id} onClick={() => setNewConvoMembers(m => m.includes(u.id) ? m.filter(x => x !== u.id) : [...m, u.id])} style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', border: '1px solid #e0d8cc', background: newConvoMembers.includes(u.id) ? '#0f0e0d' : 'white', color: newConvoMembers.includes(u.id) ? 'white' : '#3a3530', cursor: 'pointer', fontSize: '0.78rem' }}>{u.name}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={createConversation} disabled={newConvoMembers.length === 0} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: '0.82rem', opacity: newConvoMembers.length === 0 ? 0.4 : 1 }}>Start</button>
                  <button onClick={() => { setShowNewConvo(false); setNewConvoMembers([]); setNewConvoName('') }} style={{ padding: '0.4rem 1rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.82rem' }}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: '1rem', height: 'calc(100vh - 200px)' }}>
              {/* Conversation list */}
              <div style={{ background: 'white', border: 'none', borderRadius: '14px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflowY: 'auto' }}>
                {conversations.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#8a8070', fontSize: '0.85rem' }}>No conversations yet.<br/>Click "+ New" to start one.</div>}
                {conversations.map(convo => {
                  const otherMembers = convo.members.filter(id => id !== currentUser?.id)
                  const otherNames = otherMembers.map(id => userList.find(u => u.id === id)?.name || 'Unknown')
                  const displayName = convo.type === 'group' ? convo.name : otherNames[0] || 'Unknown'
                  const lastRead = convo.lastRead?.[currentUser?.id] || 0
                  const isActive = activeConvo?.id === convo.id
                  return (
                    <div key={convo.id} onClick={() => { setActiveConvo(convo); loadMessages(convo.id) }} style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #f5f1ea', cursor: 'pointer', background: isActive ? '#f5f1ea' : 'white', transition: 'background 0.1s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: convo.type === 'group' ? '#3d5a6e' : '#0f0e0d', color: convo.type === 'group' ? 'white' : '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700', flexShrink: 0 }}>{convo.type === 'group' ? '👥' : displayName.slice(0,2).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0f0e0d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                          {convo.lastMessage && <div style={{ fontSize: '0.72rem', color: '#8a8070', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.lastMessage.senderName}: {convo.lastMessage.text}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Message view */}
              <div style={{ background: 'white', border: 'none', borderRadius: '14px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>
                {!activeConvo ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8070', fontSize: '0.85rem' }}>Select a conversation to start messaging</div>
                ) : (
                  <>
                    <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f0ece0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{activeConvo.type === 'group' ? activeConvo.name : userList.find(u => u.id === activeConvo.members.find(m => m !== currentUser?.id))?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.7rem', color: '#8a8070' }}>{activeConvo.type === 'group' ? activeConvo.members.length + ' members' : 'Direct message'}</div>
                      </div>
                      <button onClick={async () => { await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_conversation', convoId: activeConvo.id, userId: currentUser?.id }) }); setActiveConvo(null); setConvoMessages([]); loadConversations() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '0.75rem' }}>Delete</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {convoMessages.length === 0 && <div style={{ textAlign: 'center', color: '#8a8070', fontSize: '0.82rem', marginTop: '2rem' }}>No messages yet. Say hello! 👋</div>}
                      {convoMessages.map(msg => {
                        const isMe = msg.senderId === currentUser?.id
                        return (
                          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            {!isMe && <div style={{ fontSize: '0.65rem', color: '#8a8070', marginBottom: '0.15rem', marginLeft: '0.5rem' }}>{msg.senderName}</div>}
                            <div style={{ maxWidth: '70%', padding: '0.5rem 0.85rem', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? '#0f0e0d' : '#f5f1ea', color: isMe ? 'white' : '#0f0e0d', fontSize: '0.85rem', lineHeight: '1.4' }}>{msg.text}</div>
                            <div style={{ fontSize: '0.6rem', color: '#ccc', marginTop: '0.15rem', marginLeft: isMe ? 0 : '0.5rem', marginRight: isMe ? '0.5rem' : 0 }}>{new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #f0ece0', display: 'flex', gap: '0.5rem' }}>
                      <input value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Type a message... (Enter to send)" style={{ flex: 1, padding: '0.5rem 0.85rem', borderRadius: '20px', border: '1px solid #e0d8cc', fontSize: '0.85rem', outline: 'none' }} />
                      <button onClick={sendMessage} disabled={!messageText.trim()} style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.82rem', opacity: !messageText.trim() ? 0.4 : 1 }}>Send</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {!drilldown && page === 'settings' && currentUser?.role === 'admin' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: '0 0 0.25rem 0' }}>Settings</h1>
              <p style={{ color: '#8a8070', fontSize: '0.8rem', margin: 0 }}>Manage user accounts</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
                <h2 style={{ fontSize: '0.95rem', margin: '0 0 1rem 0' }}>Create User Account</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input value={newUserForm.name} onChange={e => setNewUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Username</label>
                    <input value={newUserForm.username} onChange={e => setNewUserForm(f => ({ ...f, username: e.target.value }))} placeholder="janesmith" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input type="password" value={newUserForm.password} onChange={e => setNewUserForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input value={newUserForm.email || ''} onChange={e => setNewUserForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <select value={newUserForm.role} onChange={e => setNewUserForm(f => ({ ...f, role: e.target.value }))} style={inputStyle}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {userMgmtError && <p style={{ color: '#b85c38', fontSize: '0.8rem', margin: 0 }}>{userMgmtError}</p>}
                  {userMgmtSuccess && <p style={{ color: '#4a6741', fontSize: '0.8rem', margin: 0 }}>{userMgmtSuccess}</p>}
                  <button onClick={async () => {
                    setUserMgmtError('')
                    setUserMgmtSuccess('')
                    if (!newUserForm.name || !newUserForm.username || !newUserForm.password) { setUserMgmtError('All fields required'); return }
                    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...newUserForm, adminPassword: 'Nectera2026!' }) })
                    const data = await res.json()
                    if (data.success) {
                      setUserMgmtSuccess('User created!')
                      setNewUserForm({ name: '', username: '', password: '', email: '', role: 'member' })
                      const r2 = await fetch('/api/users?action=list')
                      setUserList(await r2.json())
                    } else {
                      setUserMgmtError(data.error || 'Failed')
                    }
                  }} style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', fontSize: '0.85rem', fontWeight: '500' }}>Create Account</button>
                </div>
              </div>

              <div style={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '0.95rem', margin: 0 }}>User Accounts</h2>
                  <button onClick={async () => { const r = await fetch('/api/users?action=list'); setUserList(await r.json()) }} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer' }}>Refresh</button>
                </div>
                {userList.length === 0 && <p style={{ color: '#8a8070', fontSize: '0.8rem' }}>Click Refresh to load users</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {userList.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', border: '1px solid #f0ece0', borderRadius: '6px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0f0e0d', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700', flexShrink: 0 }}>{u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{u.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#8a8070' }}>@{u.username} · {u.role}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                        <button onClick={() => { setEditingUser(u); setEditUserForm({ name: u.name, email: u.email || '', role: u.role }) }} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.7rem', cursor: 'pointer', color: '#3a3530' }}>Edit</button>
                        <button onClick={() => { setResetPasswordUser(u); setNewPassword('') }} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.7rem', cursor: 'pointer', color: '#3a3530' }}>Reset PW</button>
                        {u.id !== currentUser?.id && (
                          <button onClick={async () => {
                            if (!confirm('Delete ' + u.name + '?')) return
                            await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', userId: u.id, adminPassword: 'Nectera2026!' }) })
                            const r = await fetch('/api/users?action=list')
                            setUserList(await r.json())
                          }} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #fde8e8', background: '#fde8e8', fontSize: '0.7rem', cursor: 'pointer', color: '#b85c38' }}>Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {editingUser && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '1.5rem', width: '400px', maxWidth: '90vw' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Edit User</h2>
                <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#8a8070', display: 'block', marginBottom: '0.3rem' }}>Full Name</label>
                  <input value={editUserForm.name} onChange={e => setEditUserForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e0d8cc', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#8a8070', display: 'block', marginBottom: '0.3rem' }}>Email</label>
                  <input value={editUserForm.email} onChange={e => setEditUserForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e0d8cc', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#8a8070', display: 'block', marginBottom: '0.3rem' }}>Role</label>
                  <select value={editUserForm.role} onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e0d8cc', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button onClick={async () => {
                  await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', userId: editingUser.id, ...editUserForm, adminPassword: 'Nectera2026!' }) })
                  const r = await fetch('/api/users?action=list')
                  setUserList(await r.json())
                  setEditingUser(null)
                }} style={{ padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {resetPasswordUser && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '1.5rem', width: '400px', maxWidth: '90vw' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Reset Password</h2>
                <button onClick={() => setResetPasswordUser(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>✕</button>
              </div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#8a8070' }}>Set a new password for <strong>{resetPasswordUser.name}</strong></p>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e0d8cc', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '0.75rem' }} />
              <button onClick={async () => {
                if (!newPassword) return
                await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset_password_admin', userId: resetPasswordUser.id, newPassword, adminPassword: 'Nectera2026!' }) })
                setResetPasswordUser(null)
                setNewPassword('')
              }} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Reset Password</button>
            </div>
          </div>
        )}

        {!drilldown && page === 'team' && (() => {
          const subsidiaries = ['Nectera Holdings', 'Xtract Environmental Services', 'Bug Control Specialist', 'Lush Green Landscapes']
          const unassigned = employees.filter(e => !e.company)
          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: '0 0 0.25rem 0' }}>Team Directory</h1>
                  <p style={{ color: '#8a8070', margin: 0, fontSize: '0.8rem' }}>{employees.length} contact{employees.length !== 1 ? 's' : ''} across {subsidiaries.filter(s => employees.some(e => e.company === s)).length} companies</p>
                </div>
                <button onClick={() => { setEmployeeForm({ name: '', role: '', company: '', phone: '', email: '', photo: '', department: '', startDate: '', notes: '' }); setEditingEmployee(null); setShowEmployeeModal(true) }} style={{ padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '500' }}>+ Contact</button>
              </div>

              {employees.length === 0 && (
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '3rem', textAlign: 'center', color: '#8a8070' }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>No contacts yet</div>
                  <div style={{ fontSize: '0.8rem' }}>Click "+ Contact" to get started</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {subsidiaries.filter(s => employees.some(e => e.company === s)).map(subsidiary => {
                  const group = employees.filter(e => e.company === subsidiary)
                  return (
                    <div key={subsidiary}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e8e2d9' }}>
                        <h2 style={{ margin: 0, fontSize: '1rem', fontFamily: "'DM Serif Display', serif", fontWeight: '400', color: '#1a1814' }}>{subsidiary}</h2>
                        <span style={{ fontSize: '0.72rem', color: '#a09880', background: '#f0ece0', padding: '0.15rem 0.5rem', borderRadius: '10px' }}>{group.length}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
                        {group.map((emp, idx) => {
                          const globalIdx = employees.indexOf(emp)
                          const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          return (
                            <div key={idx} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem' }}>
                                {emp.photo ? (
                                  <img src={emp.photo} alt={emp.name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                ) : (
                                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#0f0e0d', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '600', flexShrink: 0 }}>{initials}</div>
                                )}
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>{emp.name}</div>
                                  {emp.role && <div style={{ fontSize: '0.75rem', color: '#8a8070' }}>{emp.role}</div>}
                                  {emp.department && <div style={{ fontSize: '0.7rem', color: '#a09880' }}>{emp.department}</div>}
                                </div>
                                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                                  <button onClick={() => { setEmployeeForm({...emp, department: emp.department||'', startDate: emp.startDate||'', notes: emp.notes||''}); setEditingEmployee(globalIdx); setShowEmployeeModal(true) }} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.68rem', cursor: 'pointer', color: '#3a3530' }}>Edit</button>
                                  <button onClick={() => deleteEmployee(globalIdx)} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #fde8e8', background: '#fde8e8', fontSize: '0.68rem', cursor: 'pointer', color: '#b85c38' }}>✕</button>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.76rem', borderTop: '1px solid #f4f0e8', paddingTop: '0.75rem' }}>
                                {emp.email && <a href={'mailto:' + emp.email} style={{ color: '#3d5a6e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="2" width="10" height="8" rx="1.5" fill="#3d5a6e" opacity="0.7"/><path d="M1 3 L6 7 L11 3" stroke="white" strokeWidth="1" fill="none"/></svg>{emp.email}
                                </a>}
                                {emp.phone && <a href={'tel:' + emp.phone} style={{ color: '#3a3530', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 1.5 C2 1.5 3.5 1.5 4 3 L4.5 4.5 C4.5 4.5 3 5 3.5 6.5 C4 8 5.5 9.5 7 10 C8.5 10.5 8.5 9 8.5 9 L10 9.5 C11.5 10 11.5 11.5 11.5 11.5 C11.5 11.5 10 12.5 8.5 11.5 C5 9.5 2.5 7 1.5 3.5 C0.5 0.5 2 1.5 2 1.5Z" fill="#3a3530" opacity="0.7"/></svg>{emp.phone}
                                </a>}
                                {emp.startDate && <div style={{ color: '#a09880', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="2" width="10" height="9" rx="1.5" fill="#a09880" opacity="0.5"/><rect x="1" y="2" width="10" height="3.5" rx="1.5" fill="#a09880" opacity="0.7"/><rect x="3.5" y="0.5" width="1.5" height="3" rx="0.75" fill="#a09880"/><rect x="7" y="0.5" width="1.5" height="3" rx="0.75" fill="#a09880"/></svg>
                                  Since {new Date(emp.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </div>}
                                {emp.notes && <div style={{ color: '#8a8070', fontStyle: 'italic', marginTop: '0.2rem' }}>{emp.notes}</div>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {unassigned.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e8e2d9' }}>
                      <h2 style={{ margin: 0, fontSize: '1rem', fontFamily: "'DM Serif Display', serif", fontWeight: '400', color: '#a09880' }}>Unassigned</h2>
                      <span style={{ fontSize: '0.72rem', color: '#a09880', background: '#f0ece0', padding: '0.15rem 0.5rem', borderRadius: '10px' }}>{unassigned.length}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
                      {unassigned.map((emp, idx) => {
                        const globalIdx = employees.indexOf(emp)
                        const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        return (
                          <div key={idx} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#0f0e0d', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '600', flexShrink: 0 }}>{initials}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>{emp.name}</div>
                                {emp.role && <div style={{ fontSize: '0.75rem', color: '#8a8070' }}>{emp.role}</div>}
                              </div>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button onClick={() => { setEmployeeForm({...emp, department: emp.department||'', startDate: emp.startDate||'', notes: emp.notes||''}); setEditingEmployee(globalIdx); setShowEmployeeModal(true) }} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.68rem', cursor: 'pointer' }}>Edit</button>
                                <button onClick={() => deleteEmployee(globalIdx)} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #fde8e8', background: '#fde8e8', fontSize: '0.68rem', cursor: 'pointer', color: '#b85c38' }}>✕</button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        })()}
      </div>


      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.75rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Delete Task?</h3>
            <p style={{ color: '#8a8070', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              "{confirmDelete.name}" will be permanently removed from the spreadsheet. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#b85c38', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {reportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', width: '700px', maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e0d8cc' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1rem' }}>{reportData ? reportData.title : '...'}</div>
                <div style={{ fontSize: '0.75rem', color: '#8a8070' }}>{reportData ? reportData.company : ''} · {selectedYear}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {reportData && <button onClick={exportReportPDF} style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.75rem', cursor: 'pointer', color: '#3a3530', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{display:"block",flexShrink:0}}><rect x="2" y="1" width="9" height="12" rx="1.5" fill="#6b6560" opacity="0.7"/><rect x="4" y="1" width="9" height="12" rx="1.5" fill="#6b6560"/><rect x="9" y="1" width="4" height="4" rx="0" fill="#3a3530" opacity="0.4"/><rect x="6" y="7" width="5" height="1" rx="0.5" fill="#f4f0e8" opacity="0.9"/><rect x="6" y="9.5" width="3" height="1" rx="0.5" fill="#f4f0e8" opacity="0.6"/><circle cx="12" cy="12" r="3.5" fill="#c9a84c"/><path d="M12 10.5 L12 13.5 M10.5 12 L13.5 12" stroke="#0f0e0d" strokeWidth="1.2" strokeLinecap="round"/></svg></button>}
                <button onClick={() => { setReportModal(null); setReportData(null) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '1rem 1.5rem' }}>
              {loadingReport && <p style={{ color: '#8a8070', textAlign: 'center', padding: '2rem' }}>Loading report...</p>}
              {reportData && reportData.rows && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  {reportData.rows.map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.5rem',
                      paddingLeft: (0.5 + (row.depth || 0) * 1.25) + 'rem',
                      borderRadius: '3px',
                      background: row.isHeader ? '#f5f1ea' : row.isTotal ? '#f0ece0' : 'transparent',
                      fontWeight: row.isTotal || row.isHeader ? '600' : '400',
                      fontSize: row.isHeader ? '0.7rem' : '0.82rem',
                      textTransform: row.isHeader ? 'uppercase' : 'none',
                      letterSpacing: row.isHeader ? '0.06em' : 'normal',
                      borderTop: row.isTotal ? '1px solid #e0d8cc' : 'none',
                      gap: '1rem',
                    }}>
                      <span style={{ color: row.isHeader ? '#8a8070' : '#0f0e0d', flex: 1 }}>{row.label}</span>
                      {row.isAging && row.isTotal && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', fontWeight: '600', borderTop: '2px solid #0f0e0d', paddingTop: '0.3rem' }}>
                          <span style={{ color: '#4a6741', minWidth: '70px', textAlign: 'right' }}>${row.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#9a6a20', minWidth: '70px', textAlign: 'right' }}>${row.over30.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#b85c38', minWidth: '70px', textAlign: 'right' }}>${row.over60.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#b85c38', minWidth: '70px', textAlign: 'right' }}>${row.over90.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#8b0000', minWidth: '70px', textAlign: 'right' }}>${row.over91.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span style={{ color: '#0f0e0d', minWidth: '70px', textAlign: 'right' }}>${row.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {row.isAging && !row.colHeaders && !row.isTotal && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
                          <span style={{ color: '#4a6741', minWidth: '70px', textAlign: 'right' }}>{row.current > 0 ? '$' + row.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over30 > 0 ? '#9a6a20' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over30 > 0 ? '$' + row.over30.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over60 > 0 ? '#b85c38' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over60 > 0 ? '$' + row.over60.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over90 > 0 ? '#b85c38' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over90 > 0 ? '$' + row.over90.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: row.over91 > 0 ? '#8b0000' : '#ccc', minWidth: '70px', textAlign: 'right' }}>{row.over91 > 0 ? '$' + row.over91.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                          <span style={{ color: '#0f0e0d', fontWeight: '600', minWidth: '70px', textAlign: 'right' }}>${row.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {row.isAging && row.colHeaders && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.68rem', color: '#8a8070', fontWeight: '600' }}>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>Current</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>1-30</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>31-60</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>61-90</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>91+</span>
                          <span style={{ minWidth: '70px', textAlign: 'right' }}>Total</span>
                        </div>
                      )}
                      {!row.isAging && row.value !== null && <span style={{ color: row.value < 0 ? '#b85c38' : '#0f0e0d', fontVariantNumeric: 'tabular-nums' }}>{row.value < 0 ? '-$' : '$'}{Math.abs(row.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <>
          {/* Mobile top bar */}
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, background: '#0f0e0d', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', padding: '0.5rem' }}>
              <span style={{ width: '18px', height: '2px', background: '#f4f0e8', borderRadius: '2px', display: 'block' }} />
              <span style={{ width: '18px', height: '2px', background: '#f4f0e8', borderRadius: '2px', display: 'block' }} />
              <span style={{ width: '18px', height: '2px', background: '#f4f0e8', borderRadius: '2px', display: 'block' }} />
            </button>
            <span style={{ color: 'white', fontSize: '1rem', fontWeight: '600', letterSpacing: '0.02em' }}>Nectera Holdings</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button onClick={() => { setPage('messages'); setDrilldown(null) }} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="2" width="16" height="11" rx="2.5" fill="#f5f1ea" opacity="0.8"/><path d="M4 14 L3 17 L8 14" fill="#f5f1ea" opacity="0.5"/><rect x="4" y="6" width="5" height="1.5" rx="0.75" fill="#0f0e0d" opacity="0.5"/><rect x="4" y="9" width="8" height="1.5" rx="0.75" fill="#0f0e0d" opacity="0.3"/></svg>
                {unreadMessages > 0 && <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#b85c38', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>{unreadMessages}</span>}
              </button>
              <button onClick={() => setShowNotifications(!showNotifications)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5 C6 1.5 4 3.5 4 6.5 L4 10 L2.5 12 L15.5 12 L14 10 L14 6.5 C14 3.5 12 1.5 9 1.5Z" fill="#f5f1ea" opacity="0.8"/><path d="M4 10 L2.5 12 L15.5 12 L14 10Z" fill="#f5f1ea" opacity="0.5"/><rect x="7" y="12" width="4" height="2.5" rx="1.25" fill="#f5f1ea" opacity="0.6"/><circle cx="13.5" cy="4.5" r="2.5" fill="#c9a84c"/></svg>
                {(notifications.length + taskNotifications.length + notesNotifications.length) > 0 && <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#b85c38', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>{notifications.length + taskNotifications.length + notesNotifications.length}</span>}
              </button>
            </div>
          </div>

          {/* Menu overlay */}
          {mobileMenuOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex' }}>
              <div style={{ width: '75vw', maxWidth: '300px', background: '#0f0e0d', height: '100%', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>Nectera Holdings</h2>
                  <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#8a8070', fontSize: '1.3rem', cursor: 'pointer', padding: 0 }}>✕</button>
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                  {navItems.map(item => (
                    <button key={item.id} onClick={() => { setPage(item.id); setDrilldown(null); setMobileMenuOpen(false) }} style={{ background: page === item.id && !drilldown ? 'rgba(201,168,76,0.15)' : 'none', color: page === item.id && !drilldown ? '#c9a84c' : '#f5f1ea', border: 'none', borderRadius: '8px', padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <NavIcon id={item.id} active={page === item.id && !drilldown} />
                      {item.label}
                    </button>
                  ))}
                </nav>
                {currentUser && (
                  <div style={{ borderTop: '1px solid #2a2825', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#c9a84c', color: '#0f0e0d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '700' }}>{currentUser.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</div>
                    <span style={{ color: '#c9c5be', fontSize: '0.8rem', flex: 1 }}>{currentUser.name}</span>
                    <button onClick={() => { handleLogout(); setMobileMenuOpen(false) }} style={{ background: 'none', border: '1px solid #3a3530', borderRadius: '4px', color: '#8a8070', fontSize: '0.65rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>Sign out</button>
                  </div>
                )}
              </div>
              <div onClick={() => setMobileMenuOpen(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
            </div>
          )}
        </>
      )}
        </div>
      </div>
  )
}

