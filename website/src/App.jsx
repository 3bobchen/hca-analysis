import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from 'recharts'
import './App.css'

const COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a',
  '#0891b2', '#4f46e5', '#c026d3', '#d97706', '#059669',
  '#6366f1',
]

const DIRECTION_COLORS = {
  liberal: '#2563eb',
  conservative: '#dc2626',
  unspecifiable: '#9ca3af',
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

function ChartCard({ title, wide, children }) {
  return (
    <div className={`chart-card${wide ? ' wide' : ''}`}>
      <h2>{title}</h2>
      {children}
    </div>
  )
}

function shortenLabel(label, max = 20) {
  if (!label || label.length <= max) return label
  return label.slice(0, max) + '...'
}

function shortenTerm(term) {
  if (!term) return term
  // "1994-1995" -> "'95"
  const parts = term.split('-')
  return "'" + (parts[1] || parts[0]).slice(2)
}

function App() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data.json')
      .then(r => r.json())
      .then(setData)
  }, [])

  if (!data) return <div className="loading">Loading dashboard...</div>

  const { summary, casesByTerm, casesByIssue, directionTrend, partyWinning,
    jurisdiction, voteSplits, originStates, panelComposition } = data

  const termData = casesByTerm.map(d => ({ ...d, label: shortenTerm(d.term) }))
  const dirData = directionTrend.map(d => ({ ...d, label: shortenTerm(d.term) }))
  const compData = panelComposition.map(d => ({ ...d, label: shortenTerm(d.term) }))

  // Shorten party winning labels
  const winningData = partyWinning.map(d => ({
    ...d,
    short: d.outcome.includes('favourable disposition for petitioning party unclear')
      ? 'Unclear'
      : d.outcome.includes('no favourable')
        ? 'Respondent wins'
        : 'Appellant wins',
  }))

  return (
    <>
      <div className="header">
        <h1>High Court of Australia Dashboard</h1>
        <p>Data from the HCDB (Robinson & Leslie, 2024)</p>
      </div>

      <div className="stats-row">
        <StatCard label="Total Cases" value={summary.totalCases.toLocaleString()} sub={summary.termRange} />
        <StatCard label="Court Terms" value={summary.totalTerms} />
        <StatCard label="Unanimous" value={`${summary.unanimousPct}%`} sub={`${summary.unanimousDecisions} cases`} />
        <StatCard label="Issue Areas" value={casesByIssue.length} />
      </div>

      <div className="charts-grid">
        <ChartCard title="Cases Per Term" wide>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={termData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.term}
                formatter={(v) => [v, 'Cases']}
              />
              <Bar dataKey="count" fill="#2563eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Decision Direction Over Time" wide>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dirData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.term}
              />
              <Legend />
              <Area type="monotone" dataKey="liberal" stackId="1" stroke={DIRECTION_COLORS.liberal} fill={DIRECTION_COLORS.liberal} fillOpacity={0.6} />
              <Area type="monotone" dataKey="conservative" stackId="1" stroke={DIRECTION_COLORS.conservative} fill={DIRECTION_COLORS.conservative} fillOpacity={0.6} />
              <Area type="monotone" dataKey="unspecifiable" stackId="1" stroke={DIRECTION_COLORS.unspecifiable} fill={DIRECTION_COLORS.unspecifiable} fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cases by Issue Area">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={casesByIssue} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="area"
                tick={{ fontSize: 11 }}
                width={150}
                tickFormatter={(v) => shortenLabel(v, 22)}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Case Outcomes">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={winningData}
                dataKey="count"
                nameKey="short"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ short, percent }) => `${short} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {winningData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, 'Cases']} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Vote Splits">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={voteSplits}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="split" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [v, 'Cases']} />
              <Bar dataKey="count" fill="#16a34a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Case Origin by State">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={originStates} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="state"
                tick={{ fontSize: 11 }}
                width={140}
                tickFormatter={(v) => shortenLabel(v, 20)}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#ea580c" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Jurisdiction Type">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={jurisdiction}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ type, percent }) => `${shortenLabel(type, 14)} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {jurisdiction.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, 'Cases']} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Panel Composition Over Time">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={compData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.term}
                formatter={(v) => [`${(v * 100).toFixed(1)}%`]}
              />
              <Legend />
              <Line type="monotone" dataKey="avgLiberalPanel" name="Avg Liberal %" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avgWomenPanel" name="Avg Women %" stroke="#db2777" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  )
}

export default App
