import { useState, useEffect } from 'react'
import './ConstitutionalPage.css'

const DIRECTION_COLORS = {
  liberal: '#2563eb',
  conservative: '#dc2626',
  unspecifiable: '#9ca3af',
}

const FEATURED_KEYS = [
  'Implied Freedom of Political Communication',
  's 51(xxix)',
  'Judicial power - Kable principle',
]

function getDominantDirection(cases) {
  const lib = cases.filter(c => c.direction === 'liberal').length
  const con = cases.filter(c => c.direction === 'conservative').length
  if (lib === 0 && con === 0) return 'unspecifiable'
  return lib >= con ? 'liberal' : 'conservative'
}

function DirectionBar({ cases }) {
  const total = cases.length
  if (total === 0) return null
  const lib = cases.filter(c => c.direction === 'liberal').length
  const con = cases.filter(c => c.direction === 'conservative').length
  const unspec = total - lib - con
  return (
    <div
      className="direction-bar"
      title={`${lib} liberal · ${con} conservative · ${unspec} unspecifiable`}
    >
      {lib > 0 && <div className="dir-seg" style={{ flex: lib, backgroundColor: DIRECTION_COLORS.liberal }} />}
      {con > 0 && <div className="dir-seg" style={{ flex: con, backgroundColor: DIRECTION_COLORS.conservative }} />}
      {unspec > 0 && <div className="dir-seg" style={{ flex: unspec, backgroundColor: DIRECTION_COLORS.unspecifiable }} />}
    </div>
  )
}

function CaseRow({ caseData, isHighlighted, isDimmed, onMouseEnter, onMouseLeave }) {
  return (
    <div
      className={`case-row${isHighlighted ? ' row-highlighted' : ''}${isDimmed ? ' row-dimmed' : ''}`}
      style={{ '--dir-color': DIRECTION_COLORS[caseData.direction] || DIRECTION_COLORS.unspecifiable }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="case-citation">{caseData.citation}</div>
      <div className="case-details">
        <div className="case-name">{caseData.name}</div>
        <div className="case-meta">
          {caseData.date && <span className="date">{new Date(caseData.date).getFullYear()}</span>}
          {caseData.direction && (
            <span
              className="direction"
              style={{ color: DIRECTION_COLORS[caseData.direction], borderColor: DIRECTION_COLORS[caseData.direction] }}
            >
              {caseData.direction}
            </span>
          )}
          {caseData.votes && <span className="votes">{caseData.votes}</span>}
        </div>
      </div>
    </div>
  )
}

function CaseTimeline({ cases, globalMinYear, globalMaxYear, hoveredCitation, onHoverCase }) {
  const validCases = cases.filter(c => c.year)
  if (validCases.length === 0) return null

  const range = globalMaxYear - globalMinYear || 1
  const pct = (year) => ((year - globalMinYear) / range) * 100

  const yearGroups = {}
  validCases.forEach(c => {
    if (!yearGroups[c.year]) yearGroups[c.year] = []
    yearGroups[c.year].push(c)
  })

  const maxStack = Math.max(...Object.values(yearGroups).map(g => g.length))
  const trackHeight = 26 + maxStack * 14

  const ticks = []
  for (let y = globalMinYear; y <= globalMaxYear; y += 3) ticks.push(y)
  if (ticks[ticks.length - 1] !== globalMaxYear) ticks.push(globalMaxYear)

  const anyHovered = hoveredCitation !== null

  return (
    <div className="timeline-outer">
      <div className="timeline-track" style={{ height: `${trackHeight}px` }}>
        <div className="timeline-line" />

        {ticks.map(y => (
          <div key={y} className="timeline-tick" style={{ left: `${pct(y)}%` }}>
            <div className="tick-mark" />
            <span className="tick-label">{y}</span>
          </div>
        ))}

        {Object.entries(yearGroups).map(([year, group]) =>
          group.map((c, stackIdx) => {
            const isHovered = hoveredCitation === c.citation
            const isDimmed = anyHovered && !isHovered
            return (
              <div
                key={`${year}-${stackIdx}`}
                className={`timeline-dot${isHovered ? ' dot-hovered' : ''}${isDimmed ? ' dot-dimmed' : ''}`}
                style={{
                  left: `${pct(Number(year))}%`,
                  bottom: `${20 + stackIdx * 14}px`,
                  backgroundColor: DIRECTION_COLORS[c.direction] || DIRECTION_COLORS.unspecifiable,
                }}
                title={`${c.name || c.citation} (${year})${c.votes ? ` · ${c.votes}` : ''}`}
                onMouseEnter={() => onHoverCase(c.citation)}
                onMouseLeave={() => onHoverCase(null)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

function FeaturedCard({ provision, globalMinYear, globalMaxYear }) {
  const [expanded, setExpanded] = useState(false)
  const [hoveredCitation, setHoveredCitation] = useState(null)
  const dominantDir = getDominantDirection(provision.cases)
  const years = provision.cases.map(c => c.year).filter(Boolean)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const anyHovered = hoveredCitation !== null
  return (
    <div
      className="featured-card"
      style={{ '--provision-dir-color': DIRECTION_COLORS[dominantDir] }}
    >
      <button className="featured-toggle" onClick={() => setExpanded(e => !e)}>
        <div className="featured-title">
          <span className="featured-name">{provision.alias || provision.provision}</span>
          {provision.alias && (
            <span className="provision-secondary">{provision.provision}</span>
          )}
        </div>
        <div className="featured-header-right">
          <span className="featured-years">{minYear}–{maxYear}</span>
          <DirectionBar cases={provision.cases} />
          <span className="case-badge">{provision.case_count}</span>
          <span className={`toggle-icon ${expanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <>
          <CaseTimeline
            cases={provision.cases}
            globalMinYear={globalMinYear}
            globalMaxYear={globalMaxYear}
            hoveredCitation={hoveredCitation}
            onHoverCase={setHoveredCitation}
          />
          <div className="featured-cases">
            {provision.cases.map((c, i) => (
              <CaseRow
                key={i}
                caseData={c}
                isHighlighted={hoveredCitation === c.citation}
                isDimmed={anyHovered && hoveredCitation !== c.citation}
                onMouseEnter={() => setHoveredCitation(c.citation)}
                onMouseLeave={() => setHoveredCitation(null)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ProvisionCard({ provision, isExpanded, onToggle }) {
  const dominantDir = getDominantDirection(provision.cases)
  return (
    <div
      className="provision-card"
      style={{ '--provision-dir-color': DIRECTION_COLORS[dominantDir] }}
    >
      <button className="provision-header" onClick={onToggle}>
        <span className="provision-name">
          {provision.alias ? (
            <>
              <span className="provision-main">{provision.alias}</span>
              <span className="provision-secondary">{provision.provision}</span>
            </>
          ) : (
            <span className="provision-main">{provision.provision}</span>
          )}
        </span>
        <div className="provision-header-right">
          <DirectionBar cases={provision.cases} />
          <span className="case-badge">{provision.case_count}</span>
          <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </button>
      {isExpanded && (
        <div className="provision-content">
          <div className="years-row">
            <span className="years-label">Years litigated</span>
            <div className="year-pills">
              {provision.years.map(y => (
                <span key={y} className="year-pill">{y}</span>
              ))}
            </div>
          </div>
          <div className="cases-list">
            {provision.cases.map((caseData, idx) => (
              <CaseRow key={idx} caseData={caseData} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ConstitutionalPage() {
  const [data, setData] = useState(null)
  const [expandedProvisions, setExpandedProvisions] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [hideSingleItem, setHideSingleItem] = useState(true)
  const [sortOrder, setSortOrder] = useState('count')
  const [dirFilter, setDirFilter] = useState('all')

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'constitutional.json')
      .then(r => r.json())
      .then(setData)
  }, [])

  if (!data) return <div className="loading">Loading constitutional litigation data...</div>

  const allYears = data.provisions.flatMap(p => p.cases.map(c => c.year)).filter(Boolean)
  const minDataYear = Math.min(...allYears)
  const maxDataYear = Math.max(...allYears)

  const featuredProvisions = FEATURED_KEYS
    .map(k => data.provisions.find(p => p.provision === k))
    .filter(Boolean)

  let filteredProvisions = data.provisions.filter(p => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      p.provision.toLowerCase().includes(searchLower) ||
      (p.alias && p.alias.toLowerCase().includes(searchLower))
    const matchesToggle = !hideSingleItem || p.case_count > 1
    const matchesDir = dirFilter === 'all' || getDominantDirection(p.cases) === dirFilter
    return matchesSearch && matchesToggle && matchesDir
  })

  if (sortOrder === 'count') {
    filteredProvisions = [...filteredProvisions].sort((a, b) => b.case_count - a.case_count)
  } else if (sortOrder === 'alpha') {
    filteredProvisions = [...filteredProvisions].sort((a, b) =>
      (a.alias || a.provision).localeCompare(b.alias || b.provision)
    )
  }

  const toggleProvision = (provision) => {
    const next = new Set(expandedProvisions)
    if (next.has(provision)) next.delete(provision)
    else next.add(provision)
    setExpandedProvisions(next)
  }

  const expandAll = () => setExpandedProvisions(new Set(filteredProvisions.map(p => p.provision)))
  const collapseAll = () => setExpandedProvisions(new Set())

  return (
    <div className="page-content">
      <div className="header">
        <div className="header-content">
          <h1>High Court Constitutional Law</h1>
          <p className="header-subtitle">
            {data.total_cases} cases across {data.total_provisions} constitutional provisions
          </p>
          <p className="data-source">
            Data:{' '}
            <a href="https://www.unsw.edu.au/research/unswlawjournal/issues/volume-42" target="_blank" rel="noopener noreferrer">
              Lynch &amp; Williams (UNSW Law Journal)
            </a>{' '}
            &middot;{' '}
            <a href="https://aushighcourtdatabase.org" target="_blank" rel="noopener noreferrer">
              Australian High Court Database
            </a>
          </p>
        </div>
      </div>

      <h2 className="section-heading">Coverage</h2>
      <div className="const-stats">
        <div className="stat">
          <span className="stat-label">Categories</span>
          <span className="stat-value">{data.total_provisions}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Cases</span>
          <span className="stat-value">{data.total_cases}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Date Range</span>
          <span className="stat-value stat-value-range">{minDataYear}–{maxDataYear}</span>
        </div>
      </div>

      <h2 className="section-heading">Featured Provisions</h2>

      <div className="dir-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: DIRECTION_COLORS.liberal }} />
          Liberal
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: DIRECTION_COLORS.conservative }} />
          Conservative
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: DIRECTION_COLORS.unspecifiable }} />
          Unspecifiable
        </span>
        <span className="legend-note">Border = dominant direction &middot; Bar = case distribution</span>
      </div>

      <div className="featured-grid">
        {featuredProvisions.map(p => (
          <FeaturedCard
            key={p.provision}
            provision={p}
            globalMinYear={minDataYear}
            globalMaxYear={maxDataYear}
          />
        ))}
      </div>

      <h2 className="section-heading">All Provisions</h2>

      <div className="const-controls">
        <input
          type="text"
          placeholder="Search provisions (e.g., 's 51', 'Chapter')"
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="control-group">
          <span className="control-label">Sort</span>
          <button
            className={`pill-btn ${sortOrder === 'count' ? 'active' : ''}`}
            onClick={() => setSortOrder('count')}
          >
            Count
          </button>
          <button
            className={`pill-btn ${sortOrder === 'alpha' ? 'active' : ''}`}
            onClick={() => setSortOrder('alpha')}
          >
            A–Z
          </button>
        </div>
        <div className="control-group">
          <span className="control-label">Direction</span>
          <button
            className={`pill-btn ${dirFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDirFilter('all')}
          >
            All
          </button>
          <button
            className={`pill-btn dir-liberal ${dirFilter === 'liberal' ? 'active' : ''}`}
            onClick={() => setDirFilter('liberal')}
          >
            Liberal
          </button>
          <button
            className={`pill-btn dir-conservative ${dirFilter === 'conservative' ? 'active' : ''}`}
            onClick={() => setDirFilter('conservative')}
          >
            Conservative
          </button>
        </div>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={hideSingleItem}
            onChange={(e) => setHideSingleItem(e.target.checked)}
            className="toggle-checkbox"
          />
          <span className="toggle-text">Hide single case categories</span>
        </label>
        <div className="toggle-buttons">
          <button className="toggle-btn" onClick={expandAll}>Expand All</button>
          <button className="toggle-btn" onClick={collapseAll}>Collapse All</button>
        </div>
      </div>

      <div className="dir-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: DIRECTION_COLORS.liberal }} />
          Liberal
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: DIRECTION_COLORS.conservative }} />
          Conservative
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: DIRECTION_COLORS.unspecifiable }} />
          Unspecifiable
        </span>
        <span className="legend-note">Border = dominant direction &middot; Bar = case distribution</span>
      </div>

      <div className="provisions-list">
        {filteredProvisions.length > 0 ? (
          filteredProvisions.map((provision) => (
            <ProvisionCard
              key={provision.provision}
              provision={provision}
              isExpanded={expandedProvisions.has(provision.provision)}
              onToggle={() => toggleProvision(provision.provision)}
            />
          ))
        ) : (
          <div className="no-results">No provisions found matching &ldquo;{searchTerm}&rdquo;</div>
        )}
      </div>
    </div>
  )
}
