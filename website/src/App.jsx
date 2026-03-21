import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from 'recharts'
import { ConstitutionalPage } from './ConstitutionalPage'
import { Navbar } from './Navbar'
import './App.css'

const COLORS = [
  '#0d9488', '#7c3aed', '#f59e0b', '#ea580c', '#16a34a',
  '#65a30d', '#a855f7', '#c026d3', '#d97706', '#059669',
  '#14b8a6',
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
  const navigate = useNavigate()
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data.json')
      .then(r => r.json())
      .then(setData)
  }, [])

  const handleNavigate = (page) => {
    if (page === 'constitutional') {
      navigate('/constitutional')
    } else {
      navigate('/')
    }
  }

  return (
    <>
      <Navbar onNavigate={handleNavigate} />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<DashboardPage data={data} />} />
          <Route path="/constitutional" element={<ConstitutionalPage />} />
        </Routes>
      </main>
    </>
  )
}

const ERA_PRESETS = [
  { label: 'Gleeson', start: '1997-1998', end: '2007-2008' },
  { label: 'French',  start: '2008-2009', end: '2016-2017' },
  { label: 'Kiefel',  start: '2017-2018', end: '2020-2021' },
]

function TermRangeSlider({ terms, startIdx, endIdx, onChange }) {
  const trackRef = useRef(null)
  const draggingRef = useRef(null)
  const stateRef = useRef({ startIdx, endIdx, length: terms.length })
  const onChangeRef = useRef(onChange)

  stateRef.current = { startIdx, endIdx, length: terms.length }
  onChangeRef.current = onChange

  useEffect(() => {
    const getIdx = (clientX) => {
      if (!trackRef.current) return 0
      const rect = trackRef.current.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return Math.round(pct * (stateRef.current.length - 1))
    }
    const onMove = (e) => {
      if (!draggingRef.current) return
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const { startIdx, endIdx } = stateRef.current
      const idx = getIdx(clientX)
      if (draggingRef.current === 'start') {
        onChangeRef.current(Math.min(idx, endIdx), endIdx)
      } else {
        onChangeRef.current(startIdx, Math.max(idx, startIdx))
      }
    }
    const onUp = () => { draggingRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  const n = terms.length
  const startPct = n > 1 ? (startIdx / (n - 1)) * 100 : 0
  const endPct = n > 1 ? (endIdx / (n - 1)) * 100 : 100

  const tickStep = Math.ceil(n / 8)
  const ticks = []
  for (let i = 0; i < n; i += tickStep) ticks.push(i)
  if (ticks[ticks.length - 1] !== n - 1) ticks.push(n - 1)

  const handleTrackClick = (e) => {
    if (e.target.closest('.term-slider-handle')) return
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const idx = Math.round(pct * (n - 1))
    const { startIdx, endIdx } = stateRef.current
    if (Math.abs(idx - startIdx) <= Math.abs(idx - endIdx)) {
      onChange(Math.min(idx, endIdx), endIdx)
    } else {
      onChange(startIdx, Math.max(idx, startIdx))
    }
  }

  const presets = ERA_PRESETS.map(p => ({
    label: p.label,
    s: terms.indexOf(p.start),
    e: terms.indexOf(p.end),
  })).filter(p => p.s !== -1 && p.e !== -1)

  return (
    <div className="term-slider-card">
      <div className="term-slider-header">
        <span className="term-slider-title">Term range</span>
        <div className="term-slider-header-right">
          <div className="era-presets">
            {presets.map(p => (
              <button
                key={p.label}
                className={`era-btn${startIdx === p.s && endIdx === p.e ? ' active' : ''}`}
                onClick={() => onChange(p.s, p.e)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="term-slider-display">
            {terms[startIdx]}
            <span className="term-slider-arrow"> → </span>
            {terms[endIdx]}
          </span>
        </div>
      </div>
      <div className="term-slider-track-area" ref={trackRef} onClick={handleTrackClick}>
        <div className="term-slider-rail" />
        <div className="term-slider-fill" style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />
        {ticks.map(i => (
          <div key={i} className="term-slider-tick" style={{ left: `${(i / (n - 1)) * 100}%` }}>
            <div className="term-tick-line" />
            <span className="term-tick-label">{shortenTerm(terms[i])}</span>
          </div>
        ))}
        <div
          className="term-slider-handle"
          style={{ left: `${startPct}%` }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); draggingRef.current = 'start' }}
          onTouchStart={(e) => { e.stopPropagation(); draggingRef.current = 'start' }}
          title={terms[startIdx]}
        />
        <div
          className="term-slider-handle"
          style={{ left: `${endPct}%` }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); draggingRef.current = 'end' }}
          onTouchStart={(e) => { e.stopPropagation(); draggingRef.current = 'end' }}
          title={terms[endIdx]}
        />
      </div>
    </div>
  )
}

function aggregateByTerms(byTerm, selectedTerms) {
  const issueArea = {}
  const partyWinning = {}
  const jurisdiction = {}
  const voteSplits = {}
  const originStates = {}
  let unanimous = 0

  for (const t of selectedTerms) {
    const d = byTerm[t]
    if (!d) continue
    for (const [k, v] of Object.entries(d.issueArea)) issueArea[k] = (issueArea[k] || 0) + v
    for (const [k, v] of Object.entries(d.partyWinning)) partyWinning[k] = (partyWinning[k] || 0) + v
    for (const [k, v] of Object.entries(d.jurisdiction)) jurisdiction[k] = (jurisdiction[k] || 0) + v
    for (const [k, v] of Object.entries(d.voteSplits)) voteSplits[k] = (voteSplits[k] || 0) + v
    for (const [k, v] of Object.entries(d.originStates)) originStates[k] = (originStates[k] || 0) + v
    unanimous += d.unanimous || 0
  }

  return { issueArea, partyWinning, jurisdiction, voteSplits, originStates, unanimous }
}

function DashboardPage({ data }) {
  const [startIdx, setStartIdx] = useState(null)
  const [endIdx, setEndIdx] = useState(null)

  if (!data) return (
    <div className="loading">Loading dashboard...</div>
  )

  const allTerms = data.casesByTerm.map(d => d.term)
  const effectiveStart = startIdx ?? 0
  const effectiveEnd = endIdx ?? allTerms.length - 1

  const handleRangeChange = (s, e) => {
    setStartIdx(s)
    setEndIdx(e)
  }

  const selectedTerms = allTerms.slice(effectiveStart, effectiveEnd + 1)
  const isFiltered = effectiveStart !== 0 || effectiveEnd !== allTerms.length - 1

  const { summary, casesByTerm, directionTrend, panelComposition, byTerm } = data

  const termData = casesByTerm
    .filter(d => selectedTerms.includes(d.term))
    .map(d => ({ ...d, label: shortenTerm(d.term) }))
  const dirData = directionTrend
    .filter(d => selectedTerms.includes(d.term))
    .map(d => ({ ...d, label: shortenTerm(d.term) }))
  const compData = panelComposition
    .filter(d => selectedTerms.includes(d.term))
    .map(d => ({ ...d, label: shortenTerm(d.term) }))

  const agg = aggregateByTerms(byTerm, selectedTerms)

  // Summary stats for selected range
  const filteredCases = casesByTerm
    .filter(d => selectedTerms.includes(d.term))
    .reduce((sum, d) => sum + d.count, 0)
  const filteredUnanimous = agg.unanimous
  const filteredUnanimousPct = filteredCases > 0 ? Math.round(filteredUnanimous / filteredCases * 1000) / 10 : 0

  // Build chart data from aggregated byTerm
  const casesByIssue = Object.entries(agg.issueArea)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)

  const partyWinning = Object.entries(agg.partyWinning)
    .map(([outcome, count]) => ({ outcome, count }))
    .sort((a, b) => b.count - a.count)

  const jurisdiction = Object.entries(agg.jurisdiction)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  const voteSplits = Object.entries(agg.voteSplits)
    .map(([split, count]) => ({ split, count }))
    .sort((a, b) => b.count - a.count)

  const originStates = Object.entries(agg.originStates)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)

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
    <div className="page-content">
      <div className="header">
        <div className="header-content">
          <h1>High Court of Australia Database</h1>
          <p className="header-subtitle">Interactive visualization of the Australian High Court Database</p>
          <p className="data-source">
            Data source: <a href="https://aushighcourtdatabase.org" target="_blank" rel="noopener noreferrer">Robinson & Leslie's Australian High Court Database (2024)</a>
          </p>
        </div>
      </div>

      <div className="info-section">
        <div className="info-card">
          <h2>About This Dashboard</h2>
          <p>
            This dashboard provides an interactive visualization of the Australian High Court Database compiled by Zoe Robinson and Patrick Leslie. The database contains comprehensive information about High Court cases, including case outcomes, justice voting patterns, panel composition, and constitutional provisions.
          </p>
          <p>
            The visualizations below help you explore trends in High Court decision-making across different time periods, issue areas, and jurisdictional origins.
          </p>
        </div>
      </div>

      <TermRangeSlider
        terms={allTerms}
        startIdx={effectiveStart}
        endIdx={effectiveEnd}
        onChange={handleRangeChange}
      />

      <div className="stats-row">
        <StatCard
          label="Cases"
          value={filteredCases.toLocaleString()}
          sub={isFiltered ? `${allTerms[effectiveStart]} to ${allTerms[effectiveEnd]}` : summary.termRange}
        />
        <StatCard
          label="Unanimous"
          value={`${filteredUnanimousPct}%`}
          sub={`${filteredUnanimous} cases`}
        />
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
              <Bar dataKey="count" fill="#0d9488" radius={[3, 3, 0, 0]} />
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
              <Line type="monotone" dataKey="avgLiberalPanel" name="Progressive %" stroke="#0d9488" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avgWomenPanel" name="Women %" stroke="#d97706" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

export default App
