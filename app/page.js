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
      <div style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
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
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function Home() {
  const [authed, setAuthed] = useState(false)
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
  const [filterStatus, setFilterStatus] = useState('In Progress')
  const [saving, setSaving] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [expandedTask, setExpandedTask] = useState(null)
  const [newTask, setNewTask] = useState({ companyKey: '', name: '', lead: '', status: '', priority: '', dueDate: '', teamMembers: '', notes: '' })
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [employees, setEmployees] = useState([])
  const [lightTasks, setLightTasks] = useState([])
  const [showLightTaskModal, setShowLightTaskModal] = useState(false)
  const [editingLightTask, setEditingLightTask] = useState(null)
  const [lightTaskForm, setLightTaskForm] = useState({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', company: '', status: 'Not Started', notes: '' })
  const [lightTaskFilter, setLightTaskFilter] = useState('all')
  const [notes, setNotes] = useState({})
  const [selectedNoteCompany, setSelectedNoteCompany] = useState('Nectera Holdings')
  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const [noteEditContent, setNoteEditContent] = useState('')
  const [noteEditTitle, setNoteEditTitle] = useState('')


  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [employeeForm, setEmployeeForm] = useState({ name: '', role: '', company: '', phone: '', email: '', photo: '' })
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

  const saveNote = (company, id, title, content_text) => {
    const updated = { ...notes }
    if (!updated[company]) updated[company] = []
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    updated[company] = updated[company].map(n => n.id === id ? { ...n, title: title || 'Untitled', content: content_text, date: dateStr } : n)
    setNotes(updated)
    try { localStorage.setItem('companyNotes', JSON.stringify(updated)) } catch {}
  }

  const deleteNote = (company, id) => {
    const updated = { ...notes, [company]: (notes[company] || []).filter(n => n.id !== id) }
    setNotes(updated)
    setSelectedNoteId(null)
    setNoteEditContent('')
    setNoteEditTitle('')
    try { localStorage.setItem('companyNotes', JSON.stringify(updated)) } catch {}
  }

  const togglePinNote = (company, id) => {
    const updated = { ...notes, [company]: (notes[company] || []).map(n => n.id === id ? { ...n, pinned: !n.pinned } : n) }
    setNotes(updated)
    try { localStorage.setItem('companyNotes', JSON.stringify(updated)) } catch {}
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
    try { localStorage.setItem('lightTasks', JSON.stringify(updated)) } catch {}
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
    try { localStorage.setItem('employees', JSON.stringify(updated)) } catch {}
    setShowEmployeeModal(false)
    setEditingEmployee(null)
    setEmployeeForm({ name: '', role: '', company: '', phone: '', email: '', photo: '' })
  }

  const deleteEmployee = (idx) => {
    const updated = employees.filter((_, i) => i !== idx)
    setEmployees(updated)
    try { localStorage.setItem('employees', JSON.stringify(updated)) } catch {}
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
    try {
      const saved = JSON.parse(localStorage.getItem('employees') || '[]')
      setEmployees(saved)
    } catch {}
    try {
      const savedTasks = JSON.parse(localStorage.getItem('lightTasks') || '[]')
      setLightTasks(savedTasks)
    } catch {}
    try {
      const savedTasks = JSON.parse(localStorage.getItem('lightTasks') || '[]')
      setLightTasks(savedTasks)
    } catch {}
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
    { id: 'financials', label: 'Financials', icon: '📊' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'projects', label: 'Projects', icon: '📋' },
    { id: 'team', label: 'Team', icon: '👥' },
    { id: 'notes', label: 'Notes', icon: '📝' },
  ]

  if (!authed) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f0e0d', fontFamily: 'sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '8px', padding: '2.5rem', width: '360px', maxWidth: '90vw', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
          <h1 style={{ fontSize: '1.3rem', marginBottom: '0.25rem', color: '#0f0e0d' }}>Nectera Holdings</h1>
          <p style={{ fontSize: '0.85rem', color: '#8a8070', marginBottom: '1.5rem' }}>Enter your password to continue</p>
          <input
            type="password"
            value={passwordInput}
            onChange={e => { setPasswordInput(e.target.value); setPasswordError(false) }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            autoFocus
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '4px', border: passwordError ? '1px solid #b85c38' : '1px solid #e0d8cc', fontSize: '0.9rem', marginBottom: '0.75rem', boxSizing: 'border-box', outline: 'none' }}
          />
          {passwordError && <p style={{ color: '#b85c38', fontSize: '0.8rem', marginBottom: '0.75rem', marginTop: '-0.25rem' }}>Incorrect password</p>}
          <button onClick={handleLogin} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '500' }}>
            Sign In
          </button>
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
                <button onClick={handleCreate} disabled={creating || !newTask.name || !newTask.companyKey} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', opacity: (creating || !newTask.name || !newTask.companyKey) ? 0.5 : 1 }}>
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
        <div style={{ width: '220px', background: '#0f0e0d', color: '#f5f1ea', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Nectera Holdings</h2>
            <button onClick={() => setShowNotifications(!showNotifications)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#f5f1ea', fontSize: '1.1rem', padding: '0.1rem', display: 'flex', alignItems: 'center' }}>
              🔔
              {notifications.length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#b85c38', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>{notifications.length}</span>}
            </button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setPage(item.id); setDrilldown(null) }} style={{ background: page === item.id && !drilldown ? '#1a1918' : 'transparent', color: page === item.id && !drilldown ? '#c9a84c' : '#f5f1ea', border: 'none', borderRadius: '4px', padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem' }}>
                {item.label}
              </button>
            ))}
          </nav>
          <div style={{ marginTop: 'auto', fontSize: '0.7rem', color: '#555' }}>Live · QuickBooks + Sheets</div>
        </div>
      )}

      {showNotifications && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: isMobile ? '90vw' : '440px', background: 'white', border: '1px solid #e0d8cc', borderRadius: isMobile ? '0 0 8px 8px' : '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', zIndex: 150, maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f0ece0' }}>
            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Notifications</span>
            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8070', fontSize: '1rem' }}>X</button>
          </div>
          {notifications.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#8a8070', fontSize: '0.85rem' }}>All caught up!</div>
          )}
          {notifications.map(n => (
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
              <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); setEmployeeForm({ name: '', role: '', company: '', phone: '', email: '', photo: '' }) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
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
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); setEmployeeForm({ name: '', role: '', company: '', phone: '', email: '', photo: '' }) }} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button onClick={() => saveEmployee(employeeForm)} disabled={!employeeForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', opacity: !employeeForm.name ? 0.5 : 1 }}>
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
                <button onClick={() => saveLightTask(lightTaskForm)} disabled={!lightTaskForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', opacity: !lightTaskForm.name ? 0.5 : 1 }}>
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
                <button onClick={() => saveLightTask(lightTaskForm)} disabled={!lightTaskForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', opacity: !lightTaskForm.name ? 0.5 : 1 }}>
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
              <button onClick={() => { setReportModal(null); setReportData(null) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
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
        <div style={{ background: '#0f0e0d', color: '#f5f1ea', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Nectera Holdings</h2>
          <button onClick={() => setShowNotifications(!showNotifications)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#f5f1ea', fontSize: '1.2rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            🔔
            {notifications.length > 0 && <span style={{ background: '#b85c38', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>{notifications.length}</span>}
          </button>
        </div>
      )}

      <div style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', background: '#f5f1ea', overflowY: 'auto', paddingBottom: isMobile ? '5rem' : '2rem' }}>

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
                <div style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '1.25rem', marginBottom: '1.5rem' }}>
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
                <div style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '1.25rem' }}>
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
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0 }}>Portfolio Overview</h1>
              <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setDrilldown(null) }} style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.85rem', cursor: 'pointer' }}>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
            <p style={{ color: '#8a8070', marginBottom: '1.5rem', fontSize: '0.85rem' }}>{selectedYear} · Live from QuickBooks</p>

            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8070', marginBottom: '1rem' }}>Consolidated</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Revenue', value: totalIncome, color: '#4a6741' },
                { label: 'Total Expenses', value: totalExpenses, color: '#b85c38' },
                { label: 'Net Income', value: totalNet, color: totalNet >= 0 ? '#3d5a6e' : '#b85c38' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '1rem', borderTop: '3px solid ' + color }}>
                  <div style={{ fontSize: '0.7rem', color: '#8a8070', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: '600', color: value < 0 ? '#b85c38' : '#0f0e0d' }}>{loadingFinancials ? '-' : fmt(value)}</div>
                </div>
              ))}
            </div>

            {!loadingFinancials && chartData.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '1.25rem' }}>
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
                <div style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '1.25rem' }}>
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
                    <div key={sub.name} onClick={() => companyKeys[sub.name] && openDrilldown(companyKeys[sub.name])} style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '1.25rem', cursor: companyKeys[sub.name] ? 'pointer' : 'default' }} onMouseEnter={e => companyKeys[sub.name] && (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
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
              <button onClick={() => setShowModal(true)} style={{ padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '500' }}>
                + New Task
              </button>
            </div>
            <p style={{ color: '#8a8070', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              {activeTasks.length} active · {tasks.length} total
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>
                {companies.map(c => <option key={c} value={c}>{isMobile ? (c === 'all' ? 'All' : companyLabels[c].split(' ')[0]) : companyLabels[c]}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>
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
                    <div key={i} style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: isMobile ? '0.75rem 1rem' : '1rem 1.25rem' }}>
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
                          <div style={{ fontSize: '0.75rem', color: '#8a8070', marginBottom: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {task.lead && <span>Lead: {task.lead}</span>}
                            {showNotifications && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: isMobile ? '90vw' : '440px', background: 'white', border: '1px solid #e0d8cc', borderRadius: isMobile ? '0 0 8px 8px' : '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', zIndex: 150, maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f0ece0' }}>
            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Notifications</span>
            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8070', fontSize: '1rem' }}>X</button>
          </div>
          {notifications.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#8a8070', fontSize: '0.85rem' }}>All caught up!</div>
          )}
          {notifications.map(n => (
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
                <button onClick={() => saveLightTask(lightTaskForm)} disabled={!lightTaskForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', opacity: !lightTaskForm.name ? 0.5 : 1 }}>
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
                <button onClick={() => saveLightTask(lightTaskForm)} disabled={!lightTaskForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', opacity: !lightTaskForm.name ? 0.5 : 1 }}>
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
              <button onClick={() => { setReportModal(null); setReportData(null) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
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
                              <select value={task.priority} onChange={e => handleEdit(task, 'priority', e.target.value)} style={selectStyle(pc)}>
                                <option value="">No priority</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            )}
                            {!isMobile && (
                              <>
                                <input defaultValue={task.teamMembers} onBlur={e => e.target.value !== task.teamMembers && handleEdit(task, 'teamMembers', e.target.value)} placeholder="Team members..." style={{ fontSize: '0.75rem', color: '#8a8070', border: 'none', background: 'transparent', borderBottom: '1px dashed #ccc', outline: 'none', minWidth: '120px' }} />
                                <input defaultValue={task.dueDate} onBlur={e => e.target.value !== task.dueDate && handleEdit(task, 'dueDate', e.target.value)} placeholder="Due date..." style={{ fontSize: '0.75rem', color: '#8a8070', border: 'none', background: 'transparent', borderBottom: '1px dashed #ccc', outline: 'none', width: '80px' }} />
                              </>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                            <button onClick={() => setConfirmDelete(task)} style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #fde8e8', background: '#fde8e8', color: '#b85c38', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '500' }}>
                              Delete Task
                            </button>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#8a8070', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Notes</div>
                          <textarea defaultValue={task.notes} onBlur={e => e.target.value !== task.notes && handleEdit(task, 'notes', e.target.value)} placeholder="Add notes..." style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e0d8cc', fontSize: '0.85rem', color: '#3a3530', background: '#fdfaf5', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                        </div>
                      )}
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
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0 }}>Tasks</h1>
              <button onClick={() => { setLightTaskForm({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', company: '', status: 'Not Started', notes: '' }); setEditingLightTask(null); setShowLightTaskModal(true) }} style={{ padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '500' }}>
                + Add Task
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
              <div style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '3rem', textAlign: 'center', color: '#8a8070' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>No tasks yet</div>
                <div style={{ fontSize: '0.8rem' }}>Click "+ Add Task" to get started</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {lightTasks.filter(t => lightTaskFilter === 'all' || t.status === lightTaskFilter).map((task, idx) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Complete'
                const priorityColor = task.priority === 'High' ? '#b85c38' : task.priority === 'Medium' ? '#9a6a20' : '#4a6741'
                return (
                  <div key={idx} style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '1rem 1.25rem' }}>
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

        {!drilldown && page === 'tasks' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0 }}>Tasks</h1>
              <button onClick={() => { setLightTaskForm({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', company: '', status: 'Not Started', notes: '' }); setEditingLightTask(null); setShowLightTaskModal(true) }} style={{ padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '500' }}>
                + Add Task
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
              <div style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '3rem', textAlign: 'center', color: '#8a8070' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>No tasks yet</div>
                <div style={{ fontSize: '0.8rem' }}>Click "+ Add Task" to get started</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {lightTasks.filter(t => lightTaskFilter === 'all' || t.status === lightTaskFilter).map((task, idx) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Complete'
                const priorityColor = task.priority === 'High' ? '#b85c38' : task.priority === 'Medium' ? '#9a6a20' : '#4a6741'
                return (
                  <div key={idx} style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '1rem 1.25rem' }}>
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
                try { localStorage.setItem('companyNotes', JSON.stringify(updated)) } catch {}
              }} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>+ New Note</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {['Nectera Holdings', 'Xtract Environmental Services', 'Bug Control Specialist', 'Lush Green Landscapes'].map(co => (
                <button key={co} onClick={() => { setSelectedNoteCompany(co); setSelectedNoteId(null); setNoteEditTitle(''); setNoteEditContent('') }} style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid #e0d8cc', background: selectedNoteCompany === co ? '#0f0e0d' : 'white', color: selectedNoteCompany === co ? 'white' : '#3a3530', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {co.split(' ')[0]}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 220px)' }}>
              <div style={{ width: '240px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentNotes.length === 0 && <div style={{ color: '#8a8070', fontSize: '0.8rem', padding: '1rem 0', textAlign: 'center' }}>No notes yet.<br/>Click '+ New Note'</div>}
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
              <div style={{ flex: 1, background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!selectedNote && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8070', fontSize: '0.9rem' }}>Select or create a note</div>}
                {selectedNote && (
                  <>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f0ece0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <input value={noteEditTitle} onChange={e => setNoteEditTitle(e.target.value)} onBlur={() => saveNote(selectedNoteCompany, selectedNote.id, noteEditTitle, noteEditContent)} placeholder='Note title...' style={{ border: 'none', outline: 'none', fontSize: '1rem', fontWeight: '600', flex: 1, background: 'transparent' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => togglePinNote(selectedNoteCompany, selectedNote.id)} title={selectedNote.pinned ? 'Unpin' : 'Pin'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: selectedNote.pinned ? 1 : 0.4 }}>📌</button>
                        <button onClick={() => deleteNote(selectedNoteCompany, selectedNote.id)} style={{ background: 'none', border: '1px solid #fde8e8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', color: '#b85c38', padding: '0.2rem 0.5rem' }}>Delete</button>
                      </div>
                    </div>
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.68rem', color: '#8a8070', borderBottom: '1px solid #f5f1ea' }}>{selectedNote.date} · {selectedNoteCompany}</div>
                    <textarea value={noteEditContent} onChange={e => setNoteEditContent(e.target.value)} onBlur={() => saveNote(selectedNoteCompany, selectedNote.id, noteEditTitle, noteEditContent)} placeholder='Start writing...' style={{ flex: 1, padding: '1rem', border: 'none', outline: 'none', fontSize: '0.88rem', lineHeight: '1.6', resize: 'none', color: '#3a3530', background: 'transparent', fontFamily: 'inherit' }} />
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {!drilldown && page === 'team' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0 }}>Team Directory</h1>
              <button onClick={() => { setEmployeeForm({ name: '', role: '', company: '', phone: '', email: '', photo: '' }); setEditingEmployee(null); setShowEmployeeModal(true) }} style={{ padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '500' }}>
                + Add Employee
              </button>
            </div>
            <p style={{ color: '#8a8070', marginBottom: '1.5rem', fontSize: '0.8rem' }}>{employees.length} team member{employees.length !== 1 ? 's' : ''}</p>
            {employees.length === 0 && (
              <div style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '3rem', textAlign: 'center', color: '#8a8070' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👥</div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>No team members yet</div>
                <div style={{ fontSize: '0.8rem' }}>Click "+ Add Employee" to get started</div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {employees.map((emp, idx) => {
                const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const companyShort = emp.company ? emp.company.split(' ')[0] : ''
                return (
                  <div key={idx} style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      {emp.photo ? (
                        <img src={emp.photo} alt={emp.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0f0e0d', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '600', flexShrink: 0 }}>{initials}</div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                        {emp.role && <div style={{ fontSize: '0.78rem', color: '#8a8070' }}>{emp.role}</div>}
                        {emp.company && <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '20px', background: '#f0ece0', color: '#8a8070' }}>{companyShort}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', borderTop: '1px solid #f0ece0', paddingTop: '0.75rem' }}>
                      {emp.email && <a href={'mailto:' + emp.email} style={{ color: '#3d5a6e', textDecoration: 'none' }}>✉ {emp.email}</a>}
                      {emp.phone && <a href={'tel:' + emp.phone} style={{ color: '#3a3530', textDecoration: 'none' }}>📞 {emp.phone}</a>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => { setEmployeeForm(emp); setEditingEmployee(idx); setShowEmployeeModal(true) }} style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', fontSize: '0.7rem', cursor: 'pointer', color: '#3a3530' }}>Edit</button>
                      <button onClick={() => deleteEmployee(idx)} style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #fde8e8', background: '#fde8e8', fontSize: '0.7rem', cursor: 'pointer', color: '#b85c38' }}>Remove</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {showNotifications && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: isMobile ? '90vw' : '440px', background: 'white', border: '1px solid #e0d8cc', borderRadius: isMobile ? '0 0 8px 8px' : '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', zIndex: 150, maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f0ece0' }}>
            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Notifications</span>
            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8070', fontSize: '1rem' }}>X</button>
          </div>
          {notifications.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#8a8070', fontSize: '0.85rem' }}>All caught up!</div>
          )}
          {notifications.map(n => (
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
              <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); setEmployeeForm({ name: '', role: '', company: '', phone: '', email: '', photo: '' }) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
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
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); setEmployeeForm({ name: '', role: '', company: '', phone: '', email: '', photo: '' }) }} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #e0d8cc', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button onClick={() => saveEmployee(employeeForm)} disabled={!employeeForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', opacity: !employeeForm.name ? 0.5 : 1 }}>
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
                <button onClick={() => saveLightTask(lightTaskForm)} disabled={!lightTaskForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', opacity: !lightTaskForm.name ? 0.5 : 1 }}>
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
                <button onClick={() => saveLightTask(lightTaskForm)} disabled={!lightTaskForm.name} style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', opacity: !lightTaskForm.name ? 0.5 : 1 }}>
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
              <button onClick={() => { setReportModal(null); setReportData(null) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8a8070' }}>X</button>
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
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0f0e0d', display: 'flex', borderTop: '1px solid #222', zIndex: 50 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setPage(item.id); setDrilldown(null) }} style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: page === item.id && !drilldown ? '#c9a84c' : '#8a8070', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

