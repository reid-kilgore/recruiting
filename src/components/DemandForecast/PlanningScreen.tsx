
import { useMemo, useState } from "react"

// Planning Wireframe V3.2 — fixes stray brace and restores WeekGrid separation.
// - Header: Location + KPIs only
// - Role list with per-role Recruit + "Recruit for All Open Roles"
// - Week / Month / Year views each with navigation; Month supports year rollover
// - Clean JSX/paren closure; tests included

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
const HALF_HOUR_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? "00" : "30"
  return `${h.toString().padStart(2,'0')}:${m}`
})

const COLORS = {
  green: "#10b981",
  yellow: "#fde047",
  red: "#ef4444",
  closed: "#e5e7eb",
  g20: "#047857",
  g30: "#065f46",
  r20: "#b91c1c",
  r30: "#7f1d1d"
}

type Route = 'plan' | 'recruit'

function classifyDelta(delta: number) {
  // Yellow when |delta| < 5%
  if (delta >= 0.05) return 'green'
  if (delta <= -0.05) return 'red'
  return 'yellow'
}

function cellColor(demand: number, supply: number) {
  if (demand <= 0 && supply <= 0) return COLORS.closed // closed / no demand
  const delta = (supply - Math.max(0, demand)) / Math.max(1, demand)
  if (delta >= 0.3) return COLORS.g30
  if (delta >= 0.2) return COLORS.g20
  if (delta >= 0.1) return COLORS.green
  if (delta <= -0.3) return COLORS.r30
  if (delta <= -0.2) return COLORS.r20
  if (delta <= -0.1) return COLORS.red
  return COLORS.yellow
}

function isOpen(dayIdx: number, hour: number) {
  // Mon-Fri 09-21, Sat-Sun 10-22
  if (dayIdx <= 4) return hour >= 9 && hour < 21
  return hour >= 10 && hour < 22
}

function noise(seed: number, d: number, s: number) {
  const x = Math.sin((seed + 1) * 9301 + d * 49297 + s * 233280) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

function genWeek(role: string, weekOffset = 0) {
  const base = role === "Cook" ? 10 : role === "Server" ? 8 : role === "Bartender" ? 5 : 4
  return Array.from({ length: 7 }, (_, d) => (
    Array.from({ length: 48 }, (_, s) => {
      const hour = Math.floor(s / 2)
      const open = isOpen(d, hour)
      if (!open) return { demand: 0, supply: 0, closed: true }
      const lunch = Math.exp(-Math.pow((hour - 12) / 2, 2))
      const dinner = Math.exp(-Math.pow((hour - 19) / 2, 2))
      const weekend = (d >= 5 ? 1.25 : 1.0)
      const phase = 1 + 0.03 * Math.sin((weekOffset * 7 + d + s / 48) * 0.9)
      const demand = Math.round(base * phase * (0.25 + 1.2 * (0.7 * lunch + 1.0 * dinner)) * weekend)
      const supply = Math.max(0, Math.round(demand * (0.86 + (d % 3) * 0.03) + noise(weekOffset, d, s)))
      return { demand, supply, closed: false }
    })
  ))
}

function mondayOf(offsetWeeks = 0) {
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // 0=Mon
  const mon = new Date(now)
  mon.setDate(now.getDate() - day + offsetWeeks * 7)
  mon.setHours(0,0,0,0)
  return mon
}
function mondayOfDate(dateObj: Date){
  const d = new Date(dateObj)
  const day = (d.getDay() + 6) % 7
  const mon = new Date(d)
  mon.setDate(d.getDate() - day)
  mon.setHours(0,0,0,0)
  return mon
}
function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function fmt(d: Date) { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
function fmtMonth(year: number, month: number) { return new Date(year, month).toLocaleString(undefined, { month: 'long', year: 'numeric' }) }
function rollMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

interface PlanningScreenProps {
  selectedJobs: string[];
  setSelectedJobs: (jobs: string[]) => void;
}

export default function PlanningScreen({ selectedJobs, setSelectedJobs }: PlanningScreenProps) {
  const roles = [
    { role: "Cook", demand: 10, supply: 7 },
    { role: "Server", demand: 8, supply: 8 },
    { role: "Bartender", demand: 5, supply: 3 },
    { role: "Host", demand: 4, supply: 5 }
  ]
  const [selectedRole, setSelectedRole] = useState(roles[0].role)
  const [viewMode, setViewMode] = useState<'week'|'month'|'year'>('week')
  const [showLegend, setShowLegend] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()) // 0..11
  const [route, setRoute] = useState<Route>('plan')
  const [recruitTarget, setRecruitTarget] = useState<string | 'ALL'>('ALL')

  const toggleJobSelection = (role: string) => {
    setSelectedJobs(
      selectedJobs.includes(role) 
        ? selectedJobs.filter(r => r !== role)
        : [...selectedJobs, role]
    )
  }

  const getRecruitButtonText = () => {
    if (selectedJobs.length === 0) return 'Recruit for Job'
    if (selectedJobs.length === 1) return `Recruit ${selectedJobs[0]}s`
    if (selectedJobs.length === 2) return `Recruit ${selectedJobs[0]}s & ${selectedJobs[1]}s`
    return `Recruit ${selectedJobs[0]}s & ${selectedJobs.length - 1} more`
  }

  const weekMatrix = useMemo(() => genWeek(selectedRole, weekOffset), [selectedRole, weekOffset])
  const weekStart = useMemo(() => mondayOf(weekOffset), [weekOffset])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  function goToMonth(year: number, monthIdx: number) {
    setCurrentYear(year)
    setCurrentMonth(monthIdx)
    setViewMode('month')
  }
  function goToWeekContaining(dateObj: Date) {
    const targetMon = mondayOfDate(dateObj)
    const baseMon = mondayOf(0)
    const msPerWeek = 7 * 24 * 60 * 60 * 1000
    const diff = Math.round((targetMon.getTime() - baseMon.getTime()) / msPerWeek)
    setWeekOffset(diff)
    setViewMode('week')
  }
  function goRecruit(target: string | 'ALL' = 'ALL') {
    setRecruitTarget(target)
    setRoute('recruit')
  }
  function shiftMonth(delta: number) {
    const r = rollMonth(currentYear, currentMonth, delta)
    setCurrentYear(r.year)
    setCurrentMonth(r.month)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-900">
      <div className="flex flex-1 overflow-hidden">
        {route === 'plan' ? (
          <>
            {/* Left Panel: Roles list */}
            <div className="w-1/4 overflow-y-auto p-4 space-y-3">
              {/* Location Selector */}
              <div className="mb-3">
                <select className="w-full border rounded px-2 py-2 text-sm bg-white" defaultValue="BOS,LGA">
                  <option>Locations: BOS, LGA</option>
                </select>
              </div>
              
              {/* Recruit for Job Button */}
              <div className="mb-3">
                <button 
                  className={`w-full rounded px-3 py-2 text-sm font-medium transition ${
                    selectedJobs.length === 0 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  disabled={selectedJobs.length === 0}
                  onClick={() => {
                    if (selectedJobs.length > 0) {
                      setRecruitTarget(selectedJobs.join(','))
                      setRoute('recruit')
                    }
                  }}
                >
                  {getRecruitButtonText()}
                </button>
              </div>
              
              {roles.map((r) => {
                const gap = r.demand - r.supply
                const pct = Math.max(0, Math.min(100, (r.supply / Math.max(1, r.demand)) * 100))
                const isSelected = selectedJobs.includes(r.role)
                return (
                  <div
                    key={r.role}
                    onClick={() => setSelectedRole(r.role)}
                    className={`border rounded p-3 cursor-pointer hover:shadow transition ${
                      selectedRole === r.role ? 'ring-2 ring-blue-500' : ''
                    } ${
                      isSelected ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.role}</div>
                        <div className="text-xs text-gray-500">Demand {r.demand} | Supply {r.supply}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-gray-700 min-w-[52px] text-right">
                          {gap > 0 ? `+${gap}` : 'OK'}
                        </div>
                        <button 
                          className={`border rounded px-2 py-0.5 text-xs transition ${
                            isSelected 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            toggleJobSelection(r.role);
                          }}
                        >
                          Recruit
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 h-2 w-full bg-gray-200 rounded">
                      <div className="h-2 rounded bg-blue-500" style={{ width: pct + '%' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right Panel: Details + Heatmap */}
            <div className="w-3/4 border-l bg-white p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">{selectedRole} — Coverage Heatmap</h2>
                  {viewMode === 'week' && (
                    <div className="ml-2 flex items-center gap-1 text-sm">
                      <button onClick={()=>setWeekOffset(weekOffset-1)} className="border rounded px-2 py-0.5">◀</button>
                      <span className="text-gray-600">{fmt(weekStart)} – {fmt(weekEnd)}</span>
                      <button onClick={()=>setWeekOffset(weekOffset+1)} className="border rounded px-2 py-0.5">▶</button>
                    </div>
                  )}
                  {viewMode === 'month' && (
                    <div className="ml-2 flex items-center gap-1 text-sm">
                      <button onClick={()=>shiftMonth(-1)} className="border rounded px-2 py-0.5">◀</button>
                      <span className="text-gray-600">{fmtMonth(currentYear,currentMonth)}</span>
                      <button onClick={()=>shiftMonth(1)} className="border rounded px-2 py-0.5">▶</button>
                    </div>
                  )}
                  {viewMode === 'year' && (
                    <div className="ml-2 flex items-center gap-1 text-sm">
                      <button onClick={()=>setCurrentYear(y=>y-1)} className="border rounded px-2 py-0.5">◀</button>
                      <span className="text-gray-600">{currentYear}</span>
                      <button onClick={()=>setCurrentYear(y=>y+1)} className="border rounded px-2 py-0.5">▶</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <button onClick={()=>setViewMode('week')} className={`px-2 py-1 border rounded ${viewMode==='week'?'bg-gray-900 text-white':''}`}>Week</button>
                  <button onClick={()=>setViewMode('month')} className={`px-2 py-1 border rounded ${viewMode==='month'?'bg-gray-900 text-white':''}`}>Month</button>
                  <button onClick={()=>setViewMode('year')} className={`px-2 py-1 border rounded ${viewMode==='year'?'bg-gray-900 text-white':''}`}>Year</button>
                  <button onClick={()=>setShowLegend(!showLegend)} className="ml-2 underline">Legend</button>
                </div>
              </div>

              {showLegend && (
                <div className="mb-2 p-2 border rounded bg-gray-50 text-xs flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-4 h-3 rounded" style={{background:COLORS.g30}}/>30%+ over</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-4 h-3 rounded" style={{background:COLORS.g20}}/>20% over</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-4 h-3 rounded" style={{background:COLORS.green}}/>10% over</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-4 h-3 rounded" style={{background:COLORS.yellow}}/>match</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-4 h-3 rounded" style={{background:COLORS.red}}/>10% short</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-4 h-3 rounded" style={{background:COLORS.r20}}/>20% short</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-4 h-3 rounded" style={{background:COLORS.r30}}/>30%+ short</span>
                  <span className="inline-flex items-center gap-1 text-gray-500"><span className="inline-block w-4 h-3 rounded" style={{background:COLORS.closed}}/>closed / no demand</span>
                </div>
              )}

              {/* Views */}
              <div className="flex-1 overflow-auto">
                {viewMode === 'week' && (
                  <WeekGrid weekMatrix={weekMatrix} />
                )}
                {viewMode === 'month' && (
                  <MonthGrid
                    weekMatrix={weekMatrix}
                    year={currentYear}
                    month={currentMonth}
                    onDayClick={(dateObj: Date)=>goToWeekContaining(dateObj)}
                  />
                )}
                {viewMode === 'year' && (
                  <YearGridDays
                    weekMatrix={weekMatrix}
                    year={currentYear}
                    onMonthClick={(monthIdx: number)=>goToMonth(currentYear, monthIdx)}
                  />
                )}
              </div>

              <TestPanel />
            </div>
          </>
        ) : (
          /* Recruiting route placeholder */
          <div className="flex-1 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recruiting</h2>
              <button className="border rounded px-3 py-1 text-sm" onClick={()=>setRoute('plan')}>Back to Planning</button>
            </div>
            <div className="text-sm text-gray-700 mb-4">Target: <b>{recruitTarget === 'ALL' ? 'All Open Roles' : recruitTarget}</b></div>
            <div className="rounded border bg-white p-4 text-sm text-gray-600">
              This is a placeholder for the dedicated Recruiting screen (campaign setup, sources, budget, creatives).
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WeekGrid({ weekMatrix }: { weekMatrix: { demand: number; supply: number; closed: boolean }[][] }) {
  return (
    <div className="min-w-[720px]">
      {/* Column headers with 2px gaps between day columns */}
      <div className="grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)`, columnGap: '2px' }}>
        <div className="text-[10px] text-gray-500 p-1"></div>
        {DAYS.map(d => (
          <div key={d} className="text-[11px] font-medium text-center p-1 sticky top-0 bg-white border-b">{d}</div>
        ))}
      </div>
      {/* Rows: 10px data row + 2px separator row per half-hour */}
      <div className="max-h-[520px] overflow-auto">
        {HALF_HOUR_SLOTS.map((t, rowIdx) => {
          const hour = Math.floor(rowIdx / 2)
          const isFullHour = rowIdx % 2 === 0
          const showLabel = isFullHour && (hour % 2 === 0) // label every 2 hours
          const hourLabel = `${hour.toString().padStart(2,'0')}:00`
          return (
            <div key={t}>
              <div className="grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)`, columnGap: '2px' }}>
                <div className="relative h-[10px] sticky left-0 bg-white">
                  {showLabel && (
                    <span className="absolute -translate-y-2 text-[9px] leading-none text-gray-500">{hourLabel}</span>
                  )}
                </div>
                {weekMatrix.map((daySlots, dayIdx) => {
                  const { demand, supply, closed } = daySlots[rowIdx]
                  const bg = closed ? COLORS.closed : cellColor(demand, supply)
                  return (
                    <div
                      key={`${dayIdx}-${rowIdx}`}
                      title={`D:${demand} S:${supply}${closed?' (closed)':''}`}
                      style={{ height: '10px', background: bg }}
                    />
                  )
                })}
              </div>
              {/* 2px separator */}
              <div className="grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)`, columnGap: '2px' }}>
                <div style={{ height: '2px', background: '#f1f5f9' }} />
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{ height: '2px', background: '#f1f5f9' }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthGrid(
  { weekMatrix, year, month, onDayClick }:
  { weekMatrix: { demand: number; supply: number; closed: boolean }[][], year: number, month: number, onDayClick?: (d: Date)=>void }
) {
  // For each weekday, compute counts of green/yellow/red across open half-hours
  const countsByWeekday = weekMatrix.map(daySlots => {
    let green = 0, yellow = 0, red = 0, open = 0
    for (const { demand, supply, closed } of daySlots) {
      if (closed) continue
      open++
      const delta = (supply - Math.max(0, demand)) / Math.max(1, demand)
      const cls = classifyDelta(delta)
      if (cls === 'green') green++
      else if (cls === 'red') red++
      else yellow++
    }
    return { green, yellow, red, open }
  })

  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const firstWeekdayJS = first.getDay() // 0=Sun..6=Sat
  const firstWeekdayMon0 = (firstWeekdayJS + 6) % 7 // 0=Mon..6=Sun
  const cells = Array.from({ length: 42 }, (_, idx) => {
    const dayNum = idx - firstWeekdayMon0 + 1
    if (dayNum < 1 || dayNum > lastDay) return { label: "", type: 'empty' as const }
    const dt = new Date(year, month, dayNum)
    const jsDay = dt.getDay()
    const weekday = (jsDay + 6) % 7
    const counts = countsByWeekday[weekday]
    if (!counts || counts.open === 0) return { label: String(dayNum), type: 'closed' as const, dateObj: dt }
    const total = counts.green + counts.yellow + counts.red
    const gW = total ? (counts.green / total) * 100 : 0
    const yW = total ? (counts.yellow / total) * 100 : 0
    const rW = total ? (counts.red / total) * 100 : 0
    return { label: String(dayNum), type: 'stripe' as const, gW, yW, rW, dateObj: dt }
  })

  return (
    <div className="grid gap-2 p-2" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
      {DAYS.map(d => (
        <div key={d} className="text-xs font-medium text-center text-gray-600">{d}</div>
      ))}
      {cells.map((c, i) => (
        <div key={i} className="border rounded h-16 p-1 flex flex-col cursor-pointer" onClick={() => c.dateObj && onDayClick && onDayClick(c.dateObj)}>
          <div className="text-[10px] text-gray-500">{c.label}</div>
          {c.type === 'empty' && <div className="flex-1 rounded bg-gray-100" />}
          {c.type === 'closed' && <div className="flex-1 rounded" style={{ background: COLORS.closed }} />}
          {c.type === 'stripe' && (
            <div className="flex-1 rounded overflow-hidden flex">
              {c.gW > 0 && <div style={{ width: `${c.gW}%`, background: COLORS.green }} />}
              {c.yW > 0 && <div style={{ width: `${c.yW}%`, background: COLORS.yellow }} />}
              {c.rW > 0 && <div style={{ width: `${c.rW}%`, background: COLORS.red }} />}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function YearGridDays(
  { weekMatrix, year, onMonthClick }:
  { weekMatrix: { demand: number; supply: number; closed: boolean }[][], year?: number, onMonthClick?: (m: number)=>void }
) {
  // Precompute weekday counts (per open half-hour) for stripes per day
  const countsByWeekday = weekMatrix.map(daySlots => {
    let green = 0, yellow = 0, red = 0, open = 0
    for (const { demand, supply, closed } of daySlots) {
      if (closed) continue
      open++
      const delta = (supply - Math.max(0, demand)) / Math.max(1, demand)
      const cls = classifyDelta(delta)
      if (cls === 'green') green++
      else if (cls === 'red') red++
      else yellow++
    }
    return { green, yellow, red, open }
  })

  const yr = year || new Date().getFullYear()

  return (
    <div className="grid gap-3 p-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(yr, m, 1)
        const lastDay = new Date(yr, m + 1, 0).getDate()
        const firstWeekdayJS = first.getDay()
        const firstWeekdayMon0 = (firstWeekdayJS + 6) % 7

        const cells = Array.from({ length: 42 }, (_, idx) => {
          const dayNum = idx - firstWeekdayMon0 + 1
          if (dayNum < 1 || dayNum > lastDay) return { type: 'empty' as const }
          const dt = new Date(yr, m, dayNum)
          const jsDay = dt.getDay()
          const weekday = (jsDay + 6) % 7
          const c = countsByWeekday[weekday]
          if (!c || c.open === 0) return { type: 'closed' as const }
          const total = c.green + c.yellow + c.red
          const gW = total ? (c.green / total) * 100 : 0
          const yW = total ? (c.yellow / total) * 100 : 0
          const rW = total ? (c.red / total) * 100 : 0
          return { type: 'stripe' as const, gW, yW, rW }
        })

        return (
          <div key={m} className="border rounded p-2 h-[154px] flex flex-col">
            <div className="text-xs font-medium text-gray-700 mb-1 cursor-pointer" onClick={() => onMonthClick && onMonthClick(m)}>
              {first.toLocaleString(undefined, { month: 'short' })}
            </div>
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {DAYS.map((d, idx) => (
                <div key={`h-${m}-${idx}`} className="text-[9px] text-gray-400 text-center">{d[0]}</div>
              ))}
              {cells.map((c, idx) => (
                <div key={idx} className="h-4">
                  {c.type === 'empty' && <div className="w-full h-[10px] rounded bg-gray-100" />}
                  {c.type === 'closed' && <div className="w-full h-[10px] rounded" style={{ background: COLORS.closed }} />}
                  {c.type === 'stripe' && (
                    <div className="w-full h-[10px] rounded overflow-hidden flex">
                      {c.gW > 0 && <div style={{ width: `${c.gW}%`, background: COLORS.green }} />}
                      {c.yW > 0 && <div style={{ width: `${c.yW}%`, background: COLORS.yellow }} />}
                      {c.rW > 0 && <div style={{ width: `${c.rW}%`, background: COLORS.red }} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// -----------------------
// Lightweight tests
// -----------------------
function runTests() {
  const results: { name: string; pass: boolean; got?: unknown }[] = []

  // Color mapping thresholds
  const yellow = cellColor(10, 10)
  results.push({ name: "match->yellow", pass: yellow === COLORS.yellow, got: yellow })
  const g10 = cellColor(10, 11)
  results.push({ name: "+10% over -> green", pass: g10 === COLORS.green, got: g10 })
  const g20 = cellColor(10, 12)
  results.push({ name: "+20% over -> medium green", pass: g20 === COLORS.g20, got: g20 })
  const g30 = cellColor(10, 13)
  results.push({ name: "+30% over -> dark green", pass: g30 === COLORS.g30, got: g30 })
  const r10 = cellColor(10, 9)
  results.push({ name: "-10% short -> red", pass: r10 === COLORS.red, got: r10 })
  const r20 = cellColor(10, 8)
  results.push({ name: "-20% short -> medium red", pass: r20 === COLORS.r20, got: r20 })
  const r30 = cellColor(10, 7)
  results.push({ name: "-30% short -> dark red", pass: r30 === COLORS.r30, got: r30 })

  // Classifier thresholds @ ±5%
  const smallOver = classifyDelta(0.03)
  results.push({ name: "+3% -> yellow class (±5%)", pass: smallOver === 'yellow', got: smallOver })
  const overEdge = classifyDelta(0.05)
  results.push({ name: "+5% -> green class (boundary)", pass: overEdge === 'green', got: overEdge })
  const smallUnder = classifyDelta(-0.03)
  results.push({ name: "-3% -> yellow class (±5%)", pass: smallUnder === 'yellow', got: smallUnder })
  const underEdge = classifyDelta(-0.05)
  results.push({ name: "-5% -> red class (boundary)", pass: underEdge === 'red', got: underEdge })

  // Closed/no-demand cell
  const closed = cellColor(0, 0)
  results.push({ name: "closed -> gray", pass: closed === COLORS.closed, got: closed })

  // Month stripe ratio consistency on a simple synthetic day count
  const total = 10; const g = 4; const y = 3; const r = 3
  const sumPct = Math.round(((g/total)*100) + ((y/total)*100) + ((r/total)*100))
  results.push({ name: "month ratios sum ~100", pass: Math.abs(sumPct - 100) <= 1, got: sumPct })

  // RollMonth tests
  const rm1 = rollMonth(2025, 0, -1) // Jan 2025 back one -> Dec 2024
  results.push({ name: "rollMonth Jan-2025 -1 -> Dec-2024", pass: rm1.year===2024 && rm1.month===11, got: `${rm1.year}-${rm1.month}` })
  const rm2 = rollMonth(2025, 11, 1) // Dec 2025 forward one -> Jan 2026
  results.push({ name: "rollMonth Dec-2025 +1 -> Jan-2026", pass: rm2.year===2026 && rm2.month===0, got: `${rm2.year}-${rm2.month}` })

  return results
}

function TestPanel() {
  const [open, setOpen] = useState(false)
  const results = useMemo(() => runTests(), [])
  const passed = results.every(r => r.pass)
  return (
    <div className="mt-4 border-t pt-2">
      <button className="text-xs underline" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"} tests ({passed ? "all passing" : "some failing"})
      </button>
      {open && (
        <div className="mt-2 text-xs">
          {results.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className={r.pass ? "text-green-700" : "text-red-700"}>{r.pass ? "PASS" : "FAIL"}</span>
              <span className="text-gray-600">{r.name}</span>
              {!r.pass && <span className="ml-2 text-gray-500">got: {String(r.got)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

