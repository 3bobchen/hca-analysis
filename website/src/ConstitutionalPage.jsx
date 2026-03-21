import { useState, useEffect } from 'react'
import './ConstitutionalPage.css'

const DIRECTION_COLORS = {
  liberal: '#2563eb',
  conservative: '#dc2626',
  unspecifiable: '#9ca3af',
}

function CaseRow({ caseData }) {
  return (
    <div className="case-row">
      <div className="case-citation">{caseData.citation}</div>
      <div className="case-details">
        <div className="case-name">{caseData.name}</div>
        <div className="case-meta">
          {caseData.date && <span className="date">{new Date(caseData.date).getFullYear()}</span>}
          {caseData.direction && (
            <span
              className="direction"
              style={{ backgroundColor: DIRECTION_COLORS[caseData.direction] }}
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

function ProvisionCard({ provision, isExpanded, onToggle }) {
  return (
    <div className="provision-card">
      <button className="provision-header" onClick={onToggle}>
        <span className="provision-name">{provision.provision}</span>
        <span className="case-badge">{provision.case_count}</span>
        <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </button>
      {isExpanded && (
        <div className="provision-content">
          <div className="years-info">
            Covered in: {provision.years.join(', ')}
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

export function ConstitutionalPage({ onNavigate }) {
  const [data, setData] = useState(null)
  const [expandedProvisions, setExpandedProvisions] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'constitutional.json')
      .then(r => r.json())
      .then(setData)
  }, [])

  if (!data) return <div className="loading">Loading constitutional litigation data...</div>

  const filteredProvisions = data.provisions.filter(p =>
    p.provision.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleProvision = (provision) => {
    const next = new Set(expandedProvisions)
    if (next.has(provision)) {
      next.delete(provision)
    } else {
      next.add(provision)
    }
    setExpandedProvisions(next)
  }

  const expandAll = () => {
    setExpandedProvisions(new Set(data.provisions.map(p => p.provision)))
  }

  const collapseAll = () => {
    setExpandedProvisions(new Set())
  }

  return (
    <>
      <div className="header">
        <h1>Constitutional Litigation</h1>
        <p>Cases organized by constitutional provision (2003-2018)</p>
      </div>

      <div className="const-controls">
        <button className="nav-back" onClick={() => onNavigate('dashboard')}>
          ← Back to Dashboard
        </button>
        <input
          type="text"
          placeholder="Search provisions (e.g., 's 51', 'Chapter')"
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="toggle-buttons">
          <button className="toggle-btn" onClick={expandAll}>Expand All</button>
          <button className="toggle-btn" onClick={collapseAll}>Collapse All</button>
        </div>
      </div>

      <div className="const-stats">
        <div className="stat">
          <span className="stat-label">Total Provisions</span>
          <span className="stat-value">{data.total_provisions}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total Cases</span>
          <span className="stat-value">{data.total_cases}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Matching Search</span>
          <span className="stat-value">{filteredProvisions.length}</span>
        </div>
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
          <div className="no-results">No provisions found matching "{searchTerm}"</div>
        )}
      </div>
    </>
  )
}
