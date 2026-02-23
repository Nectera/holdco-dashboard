const subsidiaries = [
  { name: "Xtract Environmental Services", revenue: "$142,000", profit: "$31,000", status: "Healthy" },
  { name: "Bug Control Specialist", revenue: "$98,500", profit: "$12,200", status: "Watch" },
  { name: "Lush Green Landscapes", revenue: "$204,000", profit: "$67,800", status: "Healthy" },
]

export default function Home() {
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>

      {/* Sidebar */}
      <div style={{
        width: "220px",
        background: "#0f0e0d",
        color: "#f5f1ea",
        padding: "2rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem"
      }}>
        <h2 style={{ fontSize: "1.1rem", borderBottom: "1px solid #333", paddingBottom: "1rem" }}>
          HoldCo
        </h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
          <a href="#" style={{ color: "#c9a84c", textDecoration: "none" }}>Portfolio Overview</a>
          <a href="#" style={{ color: "#f5f1ea", textDecoration: "none" }}>Financials</a>
          <a href="#" style={{ color: "#f5f1ea", textDecoration: "none" }}>Dev Tasks</a>
          <a href="#" style={{ color: "#f5f1ea", textDecoration: "none" }}>Settings</a>
        </nav>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "2rem", background: "#f5f1ea", overflowY: "auto" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Portfolio Overview</h1>
        <p style={{ color: "#8a8070", marginBottom: "2rem" }}>Live data coming soon. Showing sample figures.</p>

        {/* Subsidiary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem" }}>
          {subsidiaries.map((sub) => (
            <div key={sub.name} style={{
              background: "white",
              border: "1px solid #e0d8cc",
              borderRadius: "6px",
              padding: "1.5rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1rem", margin: 0 }}>{sub.name}</h3>
                <span style={{
                  fontSize: "0.7rem",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "20px",
                  background: sub.status === "Healthy" ? "#e8f0e8" : "#fdf3e0",
                  color: sub.status === "Healthy" ? "#4a6741" : "#9a6a20",
                }}>
                  {sub.status}
                </span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#555", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Revenue</span><strong>{sub.revenue}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Profit</span><strong>{sub.profit}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}