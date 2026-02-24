'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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
  const [filterStatus, setFilterStatus] = useState('all')
  const [saving, setSaving] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [expandedTask, setExpandedTask] = useState(null)
  const [newTask, setNewTask] = useState({ companyKey: '', name: '', lead: '', status: '', priority: '', dueDate: '', teamMembers: '', notes: '' })
  const [creating, setCreating] = useState(false)
  const [drilldown, setDrilldown] = useState(null)
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
    fetch('/api/qb/financials')
      .then(res => res.json())
      .then(d => { setData(d); setLoadingFinancials(false) })
      .catch(() => setLoadingFinancials(false))
    fetch('/api/tasks?company=all')
      .then(res => res.json())
      .then(d => { setTasks(d.tasks || []); setLoadingTasks(false) })
      .catch(() => setLoadingTasks(false))
  }, [authed])

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

  const openDrilldown = async (companyKey) => {
    setDrilldown(companyKey)
    setDrilldownData(null)
    setLoadingDrilldown(true)
    const res = await fetch(`/api/qb/details?company=${companyKey}`)
    const d = await res.json()
    setDrilldownData(d)
    setLoadingDrilldown(false)
  }

  const totalIncome = data.reduce((sum, s) => sum + getMetric(s.report, 'Total Income'), 0)
  const totalExpenses = data.reduce((sum, s) => sum + getMetric(s.report, 'Total Expenses'), 0)
  const totalNet = data.reduce((sum, s) => sum + getMetric(s.report, 'Net Income'), 0)

  const chartData = data.map(sub => ({
    name: shortName(sub.name),
    Revenue: getMetric(sub.report, 'Total Income'),
    Expenses: getMetric(sub.report, 'Total Expenses'),
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

  const activeTasks = tasks.filter(t => {
    const s = (t.status || '').toLowerCase()
    return !s.includes('complete') && s !== ''
  })

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
          <h2 style={{ fontSize: '1.1rem', borderBottom: '1px solid #333', paddingBottom: '1rem', margin: 0 }}>Nectera Holdings</h2>
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

      {isMobile && (
        <div style={{ background: '#0f0e0d', color: '#f5f1ea', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Nectera Holdings</h2>
          <span style={{ fontSize: '0.7rem', color: '#555' }}>Live</span>
        </div>
      )}

      <div style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', background: '#f5f1ea', overflowY: 'auto', paddingBottom: isMobile ? '5rem' : '2rem' }}>

        {drilldown && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <button onClick={() => { setDrilldown(null); setDrilldownData(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8070', fontSize: '0.85rem', padding: 0 }}>
                Back
              </button>
              <h1 style={{ fontSize: isMobile ? '1.3rem' : '1.8rem', margin: 0 }}>{drilldownData?.company || '...'}</h1>
            </div>
            {loadingDrilldown ? <p style={{ color: '#8a8070' }}>Loading details...</p> : drilldownData && (
              <>
                <div style={{ background: 'white', border: '1px solid #e0d8cc', borderRadius: '6px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8070', marginBottom: '1rem' }}>Monthly Trend</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={drilldownData.monthly} barGap={4}>
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
            <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', marginBottom: '0.25rem' }}>Portfolio Overview</h1>
            <p style={{ color: '#8a8070', marginBottom: '1.5rem', fontSize: '0.85rem' }}>Year to date · Live from QuickBooks</p>

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
                  const expenses = getMetric(sub.report, 'Total Expenses')
                  const gross = getMetric(sub.report, 'Gross Profit')
                  const net = getMetric(sub.report, 'Net Income')
                  const margin = income > 0 ? ((net / income) * 100).toFixed(1) : '0.0'
                  const marginPct = Math.min(Math.max(parseFloat(margin), 0), 100)
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
                        <div style={{ background: '#f0ece0', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
                          <div style={{ width: marginPct + '%', height: '100%', background: parseFloat(margin) < 0 ? '#b85c38' : '#4a6741', borderRadius: '4px' }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {!drilldown && page === 'tasks' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', margin: 0 }}>Dev Tasks</h1>
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
      </div>

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

