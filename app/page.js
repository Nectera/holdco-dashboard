'use client'
import { useEffect, useState } from 'react'

const getMetric = (report, label) => {
  try {
    const rows = report?.Rows?.Row || []
    for (const row of rows) {
      if (row?.Summary?.ColData?.[0]?.value === label) {
        const val = parseFloat(row.Summary.ColData[1]?.value || 0)
        return val
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

export default function Home() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/qb/financials')
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalIncome = data.reduce((sum, s) => sum + getMetric(s.report, 'Total Income'), 0)
  const totalExpenses = data.reduce((sum, s) => sum + getMetric(s.report, 'Total Expenses'), 0)
  const totalNet = data.reduce((sum, s) => sum + getMetric(s.report, 'Net Income'), 0)

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ width: "220px", background: "#0f0e0d", color: "#f5f1ea", padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem", flexShrink: 0 }}>
        <h2 style={{ fontSize: "1.1rem", borderBottom: "1px solid #333", paddingBottom: "1rem" }}>Nectera Holdings</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
          <a href="#" style={{ color: "#c9a84c", textDecoration: "none" }}>Portfolio Overview</a>
          <a href="#" style={{ color: "#f5f1ea", textDecoration: "none" }}>Financials</a>
          <a href="#" style={{ color: "#f5f1ea", textDecoration: "none" }}>Dev Tasks</a>
          <a href="#" style={{ color: "#f5f1ea", textDecoration: "none" }}>Settings</a>
        </nav>
      </div>
      <div style={{ flex: 1, padding: "2rem", background: "#f5f1ea", overflowY: "auto" }}>
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
              <div style={{ fontSize: "1.6rem", fontWeight: "600", color: value < 0 ? "#b85c38" : "#0f0e0d" }}>{loading ? '—' : fmt(value)}</div>
            </div>
          ))}
        </div>
        <h2 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a8070", marginBottom: "1rem" }}>Subsidiaries</h2>
        {loading ? (
          <p style={{ color: "#8a8070" }}>Loading financial data...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {data.map((sub) => {
              const income = getMetric(sub.report, 'Total Income')
              const expenses = getMetric(sub.report, 'Total Expenses')
              const gross = getMetric(sub.report, 'Gross Profit')
              const net = getMetric(sub.report, 'Net Income')
              const margin = income > 0 ? ((net / income) * 100).toFixed(1) : '0.0'
              const healthy = net >= 0
              return (
                <div key={sub.name} style={{ background: "white", border: "1px solid #e0d8cc", borderRadius: "6px", padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1rem" }}>{sub.name}</h3>
                    <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem", borderRadius: "20px", background: healthy ? "#e8f0e8" : "#fdf3e0", color: healthy ? "#4a6741" : "#9a6a20" }}>
                      {healthy ? "Profitable" : "Loss"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                    {[
                      { label: "Revenue", value: income },
                      { label: "Gross Profit", value: gross },
                      { label: "Expenses", value: expenses },
                      { label: "Net Income", value: net },
                    ].map(({ label, value }) => (
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
      </div>
    </div>
  )
}
