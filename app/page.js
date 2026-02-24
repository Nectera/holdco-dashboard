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

  const handleEdit = async (task, field, value) => {
    const globalIndex = tasks.indexOf(task)
    setSaving(s => ({ ...s, [`${globalIndex}-${field}`]: true }))
    const newTasks = [...tasks]
    newTasks[globalIndex] = { ...task, [field]: value }
    setTasks(newTasks)
    await updateTask(task.companyKey, globalIndex, field, value)
    setSaving(s => ({ ...s, [`${globalIndex}-${field}`]: false }))
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
  const statuses = ['all', 'In Progress', 'Planning', 'Not started', 'Complete', 'Urgent']

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

      <div style={{ flex: 1, padding: "2rem", background: "#f5f1ea", overflowY: "auto" }}>

        {page === 'financials' && (
          <>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Portfolio Overview</h1>
            <p style={{ color: "#8a8070", marginBottom: "2rem" }}>Year to date · Live from QuickBooks</p>

            {/* Consolidated metrics */}
            <h2 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a8070", marginBottom: "1rem" }}>Consolidated</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
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

            {/* Charts */}
            {!loadingFinancials && chartData.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
                {/* Revenue vs Expenses */}
                <div style={{ background: "white", border: "1px solid #e0d8cc", borderRadius: "6px", padding: "1.25rem" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a8070", marginBottom: "1rem" }}>Revenue vs Expenses</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} barGap={4}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8a8070' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#8a8070' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Revenue" fill="#4a6741" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#b85c38" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "0.5rem" }}>
                    <div style={{ fontSize: "0.7rem", color: "#4a6741", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <div style={{ width: 10, height: 10, background: "#4a6741", borderRadius: 2 }} /> Revenue
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#b85c38", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <div style={{ width: 10, height: 10, background: "#b85c38", borderRadius: 2 }} /> Expenses
                    </div>
                  </div>
                </div>

                {/* Net Income */}
                <div style={{ background: "white", border: "1px solid #e0d8cc", borderRadius: "6px", padding: "1.25rem" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a8070", marginBottom: "1rem" }}>Net Income by Subsidiary</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8a8070' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#8a8070' }} axisLine={false} tickLine={false} />
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

            {/* Subsidiary cards */}
            <h2 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a8070", marginBottom: "1rem" }}>Subsidiaries</h2>
            {loadingFinancials ? <p style={{ color: "#8a8070" }}>Loading...</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {data.map((sub) => {
                  const income = getMetric(sub.report, 'Total Income')
                  const expenses = getMetric(sub.report, 'Total Expenses')
                  const gross = getMetric(sub.report, 'Gross Profit')
                  const net = getMetric(sub.report, 'Net Income')
                  const margin = income > 0 ? ((net / income) * 100).toFixed(1) : '0.0'
                  const marginPct = Math.min(Math.max(parseFloat(margin), 0), 100)
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
                      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f0ece0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#8a8070", marginBottom: "0.4rem" }}>
                          <span>Net margin</span>
                          <strong style={{ color: parseFloat(margin) < 0 ? "#b85c38" : "#4a6741" }}>{margin}%</strong>
                        </div>
                        <div style={{ background: "#f0ece0", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                          <div style={{ width: `${marginPct}%`, height: "100%", background: parseFloat(margin) < 0 ? "#b85c38" : "#4a6741", borderRadius: "4px", transition: "width 0.5s ease" }} />
                        </div>
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
                  return (
                    <div key={i} style={{ background: "white", border: "1px solid #e0d8cc", borderRadius: "6px", padding: "1rem 1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "500", marginBottom: "0.35rem" }}>{task.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#8a8070", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                            {task.lead && <span>Lead: {task.lead}</span>}
                            <input
                              defaultValue={task.teamMembers}
                              onBlur={e => e.target.value !== task.teamMembers && handleEdit(task, 'teamMembers', e.target.value)}
                              placeholder="Team members..."
                              style={{ fontSize: "0.75rem", color: "#8a8070", border: "none", background: "transparent", borderBottom: "1px dashed #ccc", outline: "none", minWidth: "120px" }}
                            />
                            <input
                              defaultValue={task.dueDate}
                              onBlur={e => e.target.value !== task.dueDate && handleEdit(task, 'dueDate', e.target.value)}
                              placeholder="Due date..."
                              style={{ fontSize: "0.75rem", color: "#8a8070", border: "none", background: "transparent", borderBottom: "1px dashed #ccc", outline: "none", width: "80px" }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                          <select
                            value={task.priority}
                            onChange={e => handleEdit(task, 'priority', e.target.value)}
                            style={selectStyle(pc)}
                          >
                            <option value="">No priority</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                          <select
                            value={task.status}
                            onChange={e => handleEdit(task, 'status', e.target.value)}
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