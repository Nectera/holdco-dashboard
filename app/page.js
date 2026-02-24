'use client'
import { useEffect, useState } from 'react'

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

const statusColor = (status) => {
  const s = (status || '').toLowerCase()
  if (s.includes('complete') || s.includes('completed')) return { bg: '#e8f0e8', color: '#4a6741' }
  if (s.includes('in progress') || s.includes('in prog')) return { bg: '#e8f0f8', color: '#3d5a6e' }
  if (s.includes('planning')) return { bg: '#f0f0e8', color: '#6a6a40' }
  if (s.includes('not started')) return { bg: '#f5f1ea', color: '#8a8070' }
  if (s.includes('urgent')) return { bg: '#fde8e8', color: '#b85c38' }
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

export default function Home() {
  const [page, setPage] = useState('financials')
  const [data, setData] = useState([])
  const [tasks, setTasks] = useState([])
  const [loadingFinancials, setLoadingFinancials] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [filterCompany, setFilterCompany] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [saving, setSaving] = useState({})

  useEffect(() => {
    fetch('/api/qb/financials')
      .then(res => res.json())
      .then(d => { setData(d); setLoadingFinancials(false) })
      .catch(() => setLoadingFinancials(false))

    fetch('/api/tasks?company=all')
      .then(res => res.json())
      .then(d => { setTasks(d.tasks || []); setLoadingTasks(false) })
      .catch(() => setLoadingTasks(false))
  }, [])

  const handleEdit = async (taskIndex, field, value) => {
    const task = filteredTasks[taskIndex]
    const globalIndex = tasks.indexOf(task)
    
    setSaving({ ...saving, [`${globalIndex}-${field}`]: true })
    
    const newTasks = [...tasks]
    newTasks[globalIndex] = { ...task, [field]: value }
    setTasks(newTasks)

    await updateTask(task.companyKey, globalIndex, field, value)
    setSaving(s => ({ ...s, [`${globalIndex}-${field}`]: false }))
  }

  const totalIncome = data.reduce((sum, s) => sum + getMetric(s.report, 'Total Income'), 0)
  const totalExpenses = data.reduce((sum, s) => sum + getMetric(s.report, 'Total Expenses'), 0)
  const totalNet = data.reduce((sum, s) => sum + getMetric(s.report, 'Net Income'), 0)

  const companies = ['all', 'nectera', 'xtract', 'bcs', 'lush']
  const companyLabels = { all: 'All Companies', nectera: 'Nectera Holdings', xtract: 'Xtract', bcs: 'Bug Control', lush: 'Lush Green' }
  const statuses = ['all', 'In Progress', 'Planning', 'Not started', 'Complete', 'Urgent']

  const filteredTasks = tasks.filter(t => {
    const companyMatch = filterCompany === 'all' || t.companyKey === filterCompany
    const statusMatch = filterStatus === 'all' || (t.status || '').toLowerCase() === filterStatus.toLowerCase()
    return companyMatch && statusMatch
  })

  const activeTasks = tasks.filter(t => {
    const s = (t.status || '').toLowerCase()
    return !s.includes('complete') && !s.includes('completed') && s !== ''
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

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: "220px", background: "#0f0e0d", color: "#f5f1ea", padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem", flexShrink: 0 }}>
        <h2 style={{ fontSize: "1.1rem", borderBottom: "1px solid #333", paddingBottom: "1rem", margin: 0 }}>Nectera Holdings</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.9rem" }}>
          {[
            { id: 'financials', label: 'Portfolio Overview' },
            { id: 'tasks', label: 'Dev Tasks' },
          ].map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              background: page === item.id ? '#1a1918' : 'transparent',
              color: page === item.id ? '#c9a84c' : '#f5f1ea',
              border: 'none', borderRadius: '4px', padding: '0.5rem 0.75rem',
              textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem',
            }}>{item.label}</button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', fontSize: '0.7rem', color: '#555' }}>
          Live · QuickBooks + Sheets
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "2rem", background: "#f5f1ea", overflowY: "auto" }}>

        {page === 'financials' && (
          <>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Portfolio Overview</h1>
            <p style={{ color: "#8a8070", marginBottom: "2rem" }}>Year to date · Live from QuickBooks</p>

            <h2 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a8070", marginBottom: "1rem" }}>Consolidated</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2.5rem" }}>
              {[
                { label: "Total Revenue", value: totalIncome, color: "#4a6741" },
                { label: "Total Expenses", value: totalExpenses, color: "#b85c38" },
                { label: "Net Income", value: totalNet, color: totalNet >= 0 ? "#3d5a6e" : "#b85c38" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "white", border: "1px solid #e0d8cc", borderRadius: "6px", padding: "1.25rem", borderTop: `3px solid ${color}` }}>
                  <div style={{ fontSize: "0.7rem", color: "#8a8070", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "600", color: value < 0 ? "#b85c38" : "#0f0e0d" }}>{loadingFinancials ? '—' : fmt(value)}</div>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a8070", marginBottom: "1rem" }}>Subsidiaries</h2>
            {loadingFinancials ? <p style={{ color: "#8a8070" }}>Loading...</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {data.map((sub) => {
                  const income = getMetric(sub.report, 'Total Income')
                  const expenses = getMetric(sub.report, 'Total Expenses')
                  const gross = getMetric(sub.report, 'Gross Profit')
                  const net = getMetric(sub.report, 'Net Income')
                  const margin = income > 0 ? ((net / income) * 100).toFixed(1) : '0.0'
                  return (
                    <div key={sub.name} style={{ background: "white", border: "1px solid #e0d8cc", borderRadius: "6px", padding: "1.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                        <h3 style={{ margin: 0, fontSize: "1rem" }}>{sub.name}</h3>
                        <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem", borderRadius: "20px", background: net >= 0 ? "#e8f0e8" : "#fdf3e0", color: net >= 0 ? "#4a6741" : "#9a6a20" }}>
                          {net >= 0 ? "Profitable" : "Loss"}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                        {[{ label: "Revenue", value: income }, { label: "Gross Profit", value: gross }, { label: "Expenses", value: expenses }, { label: "Net Income", value: net }].map(({ label, value }) => (
                          <div key={label}>
                            <div style={{ fontSize: "0.65rem", color: "#8a8070", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>{label}</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: "600", color: value < 0 ? "#b85c38" : "#0f0e0d" }}>{fmt(value)}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f0ece0", fontSize: "0.75rem", color: "#8a8070" }}>
                        Net margin: <strong style={{ color: parseFloat(margin) < 0 ? "#b85c38" : "#4a6741" }}>{margin}%</strong>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {page === 'tasks' && (
          <>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Dev Tasks</h1>
            <p style={{ color: "#8a8070", marginBottom: "1.5rem" }}>
              {activeTasks.length} active tasks across {tasks.length} total · Live from Google Sheets
            </p>

            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={{ padding: "0.4rem 0.75rem", borderRadius: "4px", border: "1px solid #e0d8cc", background: "white", fontSize: "0.85rem", cursor: "pointer" }}>
                {companies.map(c => <option key={c} value={c}>{companyLabels[c]}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "0.4rem 0.75rem", borderRadius: "4px", border: "1px solid #e0d8cc", background: "white", fontSize: "0.85rem", cursor: "pointer" }}>
                {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
              </select>
              <span style={{ fontSize: "0.85rem", color: "#8a8070", alignSelf: "center" }}>{filteredTasks.length} tasks</span>
            </div>

            {loadingTasks ? <p style={{ color: "#8a8070" }}>Loading tasks...</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {filteredTasks.map((task, i) => {
                  const sc = statusColor(task.status)
                  const pc = priorityColor(task.priority)
                  const globalIndex = tasks.indexOf(task)
                  return (
                    <div key={i} style={{ background: "white", border: "1px solid #e0d8cc", borderRadius: "6px", padding: "1rem 1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "500", marginBottom: "0.35rem" }}>{task.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#8a8070", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                            {task.lead && <span>Lead: {task.lead}</span>}
                            <input
                              defaultValue={task.teamMembers}
                              onBlur={e => e.target.value !== task.teamMembers && handleEdit(i, 'teamMembers', e.target.value)}
                              placeholder="Team members..."
                              style={{ fontSize: "0.75rem", color: "#8a8070", border: "none", background: "transparent", borderBottom: "1px dashed #ccc", outline: "none", minWidth: "120px" }}
                            />
                            <input
                              defaultValue={task.dueDate}
                              onBlur={e => e.target.value !== task.dueDate && handleEdit(i, 'dueDate', e.target.value)}
                              placeholder="Due date..."
                              style={{ fontSize: "0.75rem", color: "#8a8070", border: "none", background: "transparent", borderBottom: "1px dashed #ccc", outline: "none", width: "80px" }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                          <select
                            value={task.priority}
                            onChange={e => handleEdit(i, 'priority', e.target.value)}
                            style={selectStyle(pc)}
                          >
                            <option value="">No priority</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                          <select
                            value={task.status}
                            onChange={e => handleEdit(i, 'status', e.target.value)}
                            style={selectStyle(sc)}
                          >
                            <option value="">No status</option>
                            <option value="Not started">Not started</option>
                            <option value="Planning">Planning</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Complete">Complete</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                          <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: "20px", background: "#f0ece0", color: "#8a8070" }}>
                            {task.company}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}