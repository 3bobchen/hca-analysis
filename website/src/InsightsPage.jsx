import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts'
import './InsightsPage.css'

const LIBERAL_COLOR = '#2563eb'
const CONSERVATIVE_COLOR = '#dc2626'
const UNSPEC_COLOR = '#9ca3af'
const CONTESTED_COLOR = '#ea580c'

function InsightCard({ icon, value, label, sub, accent }) {
  return (
    <div className="insight-card" style={{ '--accent-color': accent }}>
      <div className="insight-icon">{icon}</div>
      <div className="insight-value">{value}</div>
      <div className="insight-label">{label}</div>
      {sub && <div className="insight-sub">{sub}</div>}
    </div>
  )
}

function SectionHeader({ title, description }) {
  return (
    <div className="section-block-header">
      <h2>{title}</h2>
      {description && <p className="section-desc">{description}</p>}
    </div>
  )
}

function ChartCard({ title, children, wide }) {
  return (
    <div className={`ins-chart-card${wide ? ' wide' : ''}`}>
      <h3 className="ins-chart-title">{title}</h3>
      {children}
    </div>
  )
}

// Custom tooltip for the era chart
function EraTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="tooltip-title">{label} Court</div>
      {payload.map(p => (
        <div key={p.name} className="tooltip-row">
          <span className="tooltip-dot" style={{ background: p.fill }} />
          <span>{p.name}: <strong>{p.value}%</strong></span>
        </div>
      ))}
      <div className="tooltip-row muted">
        <span>{payload[0]?.payload?.from_year}–{payload[0]?.payload?.to_year} · {payload[0]?.payload?.cases} cases</span>
      </div>
    </div>
  )
}

function ImpliedFreedomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="custom-tooltip">
      <div className="tooltip-title">{label}</div>
      {payload.map(p => p.value > 0 && (
        <div key={p.name} className="tooltip-row">
          <span className="tooltip-dot" style={{ background: p.fill || p.stroke }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
      {d.case_names?.length > 0 && (
        <div className="tooltip-cases">
          {d.case_names.map((name, i) => (
            <div key={i} className="tooltip-case-row">
              <span
                className="tooltip-case-dot"
                style={{ background: d.directions?.[i] === 'liberal' ? LIBERAL_COLOR : d.directions?.[i] === 'conservative' ? CONSERVATIVE_COLOR : UNSPEC_COLOR }}
              />
              <span className="tooltip-case-name">{name}</span>
              {d.vote_splits?.[i] && <span className="tooltip-votes">{d.vote_splits[i]}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TopicTable({ data }) {
  const [sort, setSort] = useState('cases')

  const sorted = [...data].sort((a, b) => {
    if (sort === 'cases') return b.cases - a.cases
    if (sort === 'contested') return b.contested_pct - a.contested_pct
    if (sort === 'liberal') return b.liberal_pct - a.liberal_pct
    return 0
  })

  return (
    <div className="topic-table-wrap">
      <div className="topic-table-controls">
        <span className="table-sort-label">Sort by:</span>
        {[
          { key: 'cases', label: 'Cases' },
          { key: 'contested', label: 'Contested %' },
          { key: 'liberal', label: 'Liberal %' },
        ].map(s => (
          <button
            key={s.key}
            className={`pill-btn-sm ${sort === s.key ? 'active' : ''}`}
            onClick={() => setSort(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="topic-table">
        <div className="topic-table-head">
          <div className="col-topic">Topic</div>
          <div className="col-num">Cases</div>
          <div className="col-bar-head">Contested %<span className="col-head-note"> (≥2 dissents)</span></div>
          <div className="col-bar-head">Decision Direction</div>
          <div className="col-num">Avg Majority</div>
        </div>
        {sorted.map((row, i) => (
          <div key={i} className="topic-table-row">
            <div className="col-topic">{row.topic}</div>
            <div className="col-num">{row.cases}</div>
            <div className="col-bar">
              <div className="mini-bar-track">
                <div
                  className="mini-bar-fill contested"
                  style={{ width: `${row.contested_pct}%` }}
                />
              </div>
              <span className="mini-bar-label">{row.contested_pct}%</span>
            </div>
            <div className="col-bar">
              <div className="direction-stack-bar">
                {row.liberal_pct > 0 && (
                  <div style={{ width: `${row.liberal_pct}%`, background: LIBERAL_COLOR }} title={`Liberal: ${row.liberal_pct}%`} />
                )}
                {row.conservative_pct > 0 && (
                  <div style={{ width: `${row.conservative_pct}%`, background: CONSERVATIVE_COLOR }} title={`Conservative: ${row.conservative_pct}%`} />
                )}
                {(100 - row.liberal_pct - row.conservative_pct) > 0 && (
                  <div style={{ width: `${100 - row.liberal_pct - row.conservative_pct}%`, background: UNSPEC_COLOR }} title="Unspecifiable" />
                )}
              </div>
              <span className="dir-labels">
                <span style={{ color: LIBERAL_COLOR }}>{row.liberal_pct}%</span>
                {' / '}
                <span style={{ color: CONSERVATIVE_COLOR }}>{row.conservative_pct}%</span>
              </span>
            </div>
            <div className="col-num">{Math.round(row.avg_majority_share * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InsightsPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'insights.json')
      .then(r => r.json())
      .then(setData)
  }, [])

  if (!data) return <div className="loading">Loading insights...</div>

  const { summary, vote_splits, topic_breakdown, direction_by_era, implied_freedom, corporations_cases } = data

  const mostConservativeEra = [...direction_by_era].sort((a, b) => a.liberal_pct - b.liberal_pct)[0]

  // Sort vote splits sensibly: 7-x first, then 6-x, etc.
  const voteSplitsSorted = [...vote_splits].sort((a, b) => {
    const [am, an] = a.split.split('-').map(Number)
    const [bm, bn] = b.split.split('-').map(Number)
    const at = am + an, bt = bm + bn
    if (at !== bt) return bt - at
    return bm - am
  })

  return (
    <div className="page-content">
      <div className="header">
        <div className="header-content">
          <h1>Constitutional Insights</h1>
          <p className="header-subtitle">
            Voting patterns and decision trends across {summary.total_constitutional_cases} constitutional cases
          </p>
          <p className="data-source">
            Data source:{' '}
            <a href="https://aushighcourtdatabase.org" target="_blank" rel="noopener noreferrer">
              Robinson &amp; Leslie's Australian High Court Database (2024)
            </a>
          </p>
        </div>
      </div>

      {/* Key findings callout row */}
      <div className="insight-cards-row">
        <InsightCard
          icon="⚖️"
          value={`${summary.unanimous_pct}%`}
          label="Unanimous constitutional decisions"
          sub={`${summary.total_constitutional_cases} total cases`}
          accent="#0d9488"
        />
        <InsightCard
          icon="🏭"
          value={`${summary.corporations_contested_pct}%`}
          label="Corporations power cases contested"
          sub="Most divisive constitutional topic"
          accent={CONTESTED_COLOR}
        />
        <InsightCard
          icon="🗣️"
          value={`${summary.freedom_conservative_pct}%`}
          label="Implied freedom cases: conservative outcome"
          sub={`${summary.freedom_total} cases total`}
          accent={CONSERVATIVE_COLOR}
        />
        <InsightCard
          icon="📉"
          value={`${mostConservativeEra?.liberal_pct}%`}
          label={`Liberal outcomes under ${mostConservativeEra?.chief} CJ`}
          sub="Lowest of any era in the dataset"
          accent={LIBERAL_COLOR}
        />
      </div>

      {/* ── Vote Split Distribution ── */}
      <SectionHeader
        title="Vote Split Distribution"
        description="How often constitutional cases are decided unanimously vs by a narrow majority"
      />
      <div className="ins-charts-grid">
        <ChartCard title="Constitutional Cases by Vote Split" wide>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={voteSplitsSorted} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="split" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [v, 'Cases']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fill: 'var(--text)' }}>
                {voteSplitsSorted.map((entry, i) => {
                  const [maj, min] = entry.split.split('-').map(Number)
                  const isUnanimous = min === 0
                  const isClose = maj - min <= 1
                  const color = isUnanimous ? '#0d9488' : isClose ? CONTESTED_COLOR : '#7c3aed'
                  return <Cell key={i} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-legend-row">
            <span className="legend-chip" style={{ '--chip-color': '#0d9488' }}>Unanimous</span>
            <span className="legend-chip" style={{ '--chip-color': '#7c3aed' }}>Clear majority</span>
            <span className="legend-chip" style={{ '--chip-color': CONTESTED_COLOR }}>Narrow (1-vote margin)</span>
          </div>
        </ChartCard>
      </div>

      {/* ── Direction by Chief Justice Era ── */}
      <SectionHeader
        title="Decision Direction by Chief Justice Era"
        description="Constitutional cases only — ideological direction of outcomes across each court's tenure"
      />
      <div className="ins-charts-grid">
        <ChartCard title="Liberal vs Conservative by Era" wide>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={direction_by_era}
              margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="chief"
                tick={{ fontSize: 13 }}
                tickFormatter={(v) => `${v} CJ`}
              />
              <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
              <Tooltip content={<EraTooltip />} />
              <Legend />
              <Bar dataKey="liberal_pct" name="Liberal" fill={LIBERAL_COLOR} radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="conservative_pct" name="Conservative" fill={CONSERVATIVE_COLOR} radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="unspecifiable_pct" name="Unspecifiable" fill={UNSPEC_COLOR} radius={[0, 0, 3, 3]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Constitutional Topic Analysis ── */}
      <SectionHeader
        title="Constitutional Topic Analysis"
        description="Breakdown of all constitutional issue categories with ≥3 cases — contested rate, decision direction, and average majority size"
      />
      <TopicTable data={topic_breakdown} />

      {/* ── Implied Freedom Timeline ── */}
      <SectionHeader
        title="Implied Freedom of Political Communication"
        description="Liberal vs conservative outcomes over time — the Court's increasing willingness to restrict the implied freedom"
      />
      <div className="ins-charts-grid">
        <ChartCard title="Decision Direction by Year" wide>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={implied_freedom}
              margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<ImpliedFreedomTooltip />} />
              <Legend />
              <Bar dataKey="liberal" name="Liberal" fill={LIBERAL_COLOR} radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="conservative" name="Conservative" fill={CONSERVATIVE_COLOR} radius={[0, 0, 0, 0]} stackId="a" />
              {implied_freedom.some(d => d.unspecifiable > 0) && (
                <Bar dataKey="unspecifiable" name="Unspecifiable" fill={UNSPEC_COLOR} stackId="a" />
              )}
            </BarChart>
          </ResponsiveContainer>
          <div className="freedom-note">
            Hover each bar for case names and vote splits. After an initially liberal period (1996–97), the Court has overwhelmingly upheld restrictions on political communication.
          </div>
        </ChartCard>
      </div>

      {/* ── Corporations Power Cases ── */}
      <SectionHeader
        title="Corporations Power (s 51(xx))"
        description="The most contested constitutional provision — all 9 cases, most clustering around WorkChoices in 2006"
      />
      <div className="corps-table-wrap">
        {corporations_cases.map((c, i) => {
          const dirColor = c.direction === 'liberal' ? LIBERAL_COLOR : c.direction === 'conservative' ? CONSERVATIVE_COLOR : UNSPEC_COLOR
          const isClose = c.maj_votes && c.min_votes && (c.maj_votes - c.min_votes) <= 1
          return (
            <div key={i} className={`corps-row${isClose ? ' corps-close' : ''}`} style={{ '--dir': dirColor }}>
              <span className="corps-year">{c.year}</span>
              <span className="corps-name">{c.name}</span>
              <span className="corps-votes">{c.maj_votes}-{c.min_votes}</span>
              <span className="corps-dir" style={{ color: dirColor, borderColor: dirColor }}>
                {c.direction}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
