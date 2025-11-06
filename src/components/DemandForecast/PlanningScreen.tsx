
import { useMemo, useState, useRef, useEffect } from "react"

// Planning Wireframe V3.2 — fixes stray brace and restores WeekGrid separation.
// - Header: Location + KPIs only
// - Role list with per-role Recruit + "Recruit for All Open Roles"
// - Week / Month / Year views each with navigation; Month supports year rollover
// - Clean JSX/paren closure; tests included

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
// Filter slots to start at 8am (index 16 = 8:00am)
const ALL_HALF_HOUR_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? "00" : "30"
  return { time: `${h.toString().padStart(2,'0')}:${m}`, index: i }
})
const HALF_HOUR_SLOTS = ALL_HALF_HOUR_SLOTS.filter(slot => slot.index >= 16) // 8am onwards

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

interface TimeRange {
  start: string;
  end: string;
  days?: number[]; // Array of day indices (0=Mon, 1=Tue, etc.)
}

interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  status: 'active' | 'suspended' | 'draft';
  locations: string[];
  jobs: string[];
  startDate: string;
  endDate?: string;
  endBudget?: number;
  endHires?: number;
  endMode: 'date' | 'budget' | 'hires';
  timeRanges?: TimeRange[];
}

interface JobFormData {
  role: string;
  completed: boolean;
  data: any;
  timeRanges?: TimeRange[];
}

interface PlanningScreenProps {
  selectedJobs: string[];
  setSelectedJobs: (jobs: string[]) => void;
  selectedLocations: string[];
  setSelectedLocations: (locations: string[]) => void;
  jobForms: JobFormData[];
  setJobForms: React.Dispatch<React.SetStateAction<JobFormData[]>>;
  onStartHiring?: () => void;
}

const CAMPAIGNS: Campaign[] = [
  { id:'c7', name:'Summer Hiring Blitz', createdAt:'2025-11-01', status: 'active', locations: ['BOS', 'LGA'], jobs: ['Server', 'Host'], startDate: '2025-11-01', endDate: '2025-12-15', endMode: 'date', timeRanges: [{ start: '11:00', end: '14:00', days: [4, 5, 6] }, { start: '17:00', end: '22:00', days: [4, 5, 6] }] },
  { id:'c6', name:'Q4 Expansion', createdAt:'2025-10-25', status: 'suspended', locations: ['DCA'], jobs: ['Cook', 'Server'], startDate: '2025-10-25', endBudget: 5000, endMode: 'budget', timeRanges: [{ start: '10:00', end: '16:00', days: [0, 1, 2, 3, 4] }] },
  { id:'c5', name:'Weekend Warriors', createdAt:'2025-10-18', status: 'active', locations: ['BOS'], jobs: ['Bartender', 'Server'], startDate: '2025-10-18', endHires: 15, endMode: 'hires', timeRanges: [{ start: '18:00', end: '23:00', days: [5, 6] }] },
  { id:'c4', name:'New Menu Launch', createdAt:'2025-10-15', status: 'active', locations: ['LGA', 'DCA'], jobs: ['Cook'], startDate: '2025-10-15', endDate: '2025-11-30', endMode: 'date', timeRanges: [{ start: '11:00', end: '15:00', days: [0, 1, 2] }] },
  { id:'c3', name:'New Location Opening', createdAt:'2025-10-14', status: 'active', locations: ['ORD'], jobs: ['Cook', 'Server', 'Host'], startDate: '2025-10-14', endDate: '2025-12-01', endMode: 'date', timeRanges: [{ start: '10:00', end: '15:00', days: [0, 1, 2] }, { start: '17:00', end: '21:00', days: [4, 5, 6] }] },
  { id:'c2', name:'Weekend Staffing', createdAt:'2025-09-28', status: 'suspended', locations: ['BOS', 'LGA'], jobs: ['Server'], startDate: '2025-09-28', endBudget: 3000, endMode: 'budget', timeRanges: [{ start: '17:00', end: '23:00', days: [5, 6] }] },
  { id:'c1', name:'Holiday Surge', createdAt:'2025-08-31', status: 'active', locations: ['BOS'], jobs: ['Cook', 'Server', 'Bartender'], startDate: '2025-08-31', endDate: '2025-12-25', endMode: 'date', timeRanges: [{ start: '11:00', end: '21:00', days: [6] }] },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function PlanningScreen({ selectedJobs, setSelectedJobs, selectedLocations, setSelectedLocations, jobForms, setJobForms, onStartHiring }: PlanningScreenProps) {
  const availableLocations = ['BOS', 'LGA', 'DCA', 'ORD']
  const roles = [
    { role: "Cook", demand: 10, supply: 7 },
    { role: "Server", demand: 8, supply: 8 },
    { role: "Bartender", demand: 5, supply: 3 },
    { role: "Host", demand: 4, supply: 5 }
  ]
  const [campaigns] = useState(CAMPAIGNS)
  const [selectedRole, setSelectedRole] = useState(roles[0].role)
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set()) // Format: "day-slotIndex"
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartCell, setDragStartCell] = useState<{day: number, slot: number} | null>(null)
  const [viewMode, setViewMode] = useState<'week'|'month'|'year'>('week')
  const [showLegend, setShowLegend] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()) // 0..11
  const [route, setRoute] = useState<Route>('plan')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const locationDropdownRef = useRef<HTMLDivElement>(null)

  // Close location dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false)
      }
    }
    if (showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLocationDropdown])

  const toggleJobSelection = (role: string) => {
    setSelectedJobs(
      selectedJobs.includes(role) 
        ? selectedJobs.filter(r => r !== role)
        : [...selectedJobs, role]
    )
  }

  const toggleLocationSelection = (location: string) => {
    setSelectedLocations(
      selectedLocations.includes(location)
        ? selectedLocations.filter(loc => loc !== location)
        : [...selectedLocations, location]
    )
  }

  const handleCellMouseDown = (day: number, slotIndex: number) => {
    setIsDragging(true)
    setDragStartCell({ day, slot: slotIndex })
    toggleCell(day, slotIndex)
  }

  const handleCellMouseEnter = (day: number, slotIndex: number) => {
    if (isDragging && dragStartCell && dragStartCell.day === day) {
      // Only drag within the same day column
      const minSlot = Math.min(dragStartCell.slot, slotIndex)
      const maxSlot = Math.max(dragStartCell.slot, slotIndex)

      const newSelected = new Set(selectedSlots)
      for (let slot = minSlot; slot <= maxSlot; slot++) {
        const key = `${day}-${slot}`
        newSelected.add(key)
      }
      setSelectedSlots(newSelected)
      updateTimeRanges(newSelected)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStartCell(null)
  }

  const toggleCell = (day: number, slotIndex: number) => {
    const key = `${day}-${slotIndex}`
    const newSelected = new Set(selectedSlots)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedSlots(newSelected)
    updateTimeRanges(newSelected)
  }

  const updateTimeRanges = (slots: Set<string>) => {
    const timeRanges = convertSlotsToTimeRanges(slots)
    const currentJobForm = jobForms.find(f => f.role === selectedRole)
    if (currentJobForm) {
      setJobForms(prev => prev.map(f =>
        f.role === selectedRole ? { ...f, timeRanges } : f
      ))
    }
  }

  const convertSlotsToTimeRanges = (slots: Set<string>): TimeRange[] => {
    if (slots.size === 0) return []

    // Group slots by day first
    const slotsByDay = new Map<number, number[]>()
    slots.forEach(key => {
      const [dayStr, slotStr] = key.split('-')
      const day = Number(dayStr)
      const slot = Number(slotStr)
      if (!slotsByDay.has(day)) {
        slotsByDay.set(day, [])
      }
      slotsByDay.get(day)!.push(slot)
    })

    // For each day, create time ranges for consecutive slots
    const rangesByDay: Array<{ day: number; start: string; end: string }> = []

    slotsByDay.forEach((daySlots, day) => {
      const sortedSlots = daySlots.sort((a, b) => a - b)
      let rangeStart = sortedSlots[0]
      let rangeEnd = sortedSlots[0]

      for (let i = 1; i <= sortedSlots.length; i++) {
        const currentSlot = sortedSlots[i]
        const prevSlot = sortedSlots[i - 1]

        if (i === sortedSlots.length || currentSlot !== prevSlot + 1) {
          const startHour = Math.floor(rangeStart / 2)
          const startMin = rangeStart % 2 === 0 ? '00' : '30'
          const endHour = Math.floor((rangeEnd + 1) / 2)
          const endMin = (rangeEnd + 1) % 2 === 0 ? '00' : '30'

          rangesByDay.push({
            day,
            start: `${startHour.toString().padStart(2, '0')}:${startMin}`,
            end: `${endHour.toString().padStart(2, '0')}:${endMin}`
          })

          if (i < sortedSlots.length) {
            rangeStart = currentSlot
            rangeEnd = currentSlot
          }
        } else {
          rangeEnd = currentSlot
        }
      }
    })

    // Group ranges with same start/end times and collect their days
    const rangeMap = new Map<string, number[]>()
    rangesByDay.forEach(({ day, start, end }) => {
      const key = `${start}-${end}`
      if (!rangeMap.has(key)) {
        rangeMap.set(key, [])
      }
      rangeMap.get(key)!.push(day)
    })

    // Convert to TimeRange array with sorted days
    const ranges: TimeRange[] = []
    rangeMap.forEach((days, key) => {
      const [start, end] = key.split('-')
      ranges.push({
        start,
        end,
        days: days.sort((a, b) => a - b)
      })
    })

    // Sort ranges by start time
    return ranges.sort((a, b) => a.start.localeCompare(b.start))
  }

  // Load selected slots when role changes
  useEffect(() => {
    const currentJobForm = jobForms.find(f => f.role === selectedRole)
    if (currentJobForm?.timeRanges) {
      const slots = new Set<string>()
      currentJobForm.timeRanges.forEach(range => {
        const [startHour, startMin] = range.start.split(':').map(Number)
        const [endHour, endMin] = range.end.split(':').map(Number)
        const startSlot = startHour * 2 + (startMin === 30 ? 1 : 0)
        const endSlot = endHour * 2 + (endMin === 30 ? 1 : 0)

        // Add for all days
        for (let day = 0; day < 7; day++) {
          for (let i = startSlot; i < endSlot; i++) {
            slots.add(`${day}-${i}`)
          }
        }
      })
      setSelectedSlots(slots)
    } else {
      setSelectedSlots(new Set())
    }
    // Only sync when role changes, not when jobForms updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole])

  // Add global mouse up handler
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

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
  // Reserved for future functionality
  // function goRecruit(target: string | 'ALL' = 'ALL') {
  //   setRecruitTarget(target)
  //   setRoute('recruit')
  // }
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
            {/* Left Panel: Roles list and Campaigns */}
            <div className="w-1/4 overflow-y-auto p-4 space-y-3">
              {/* Start Hiring Button - always visible, disabled until time ranges exist */}
              {onStartHiring && (
                <button
                  onClick={onStartHiring}
                  disabled={!jobForms.some(job => job.timeRanges && job.timeRanges.length > 0)}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    jobForms.some(job => job.timeRanges && job.timeRanges.length > 0)
                      ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Start Hiring
                </button>
              )}

              {/* Location Selector */}
              <div className="mb-3">
                <div className="relative" ref={locationDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                    className="w-full border rounded px-3 py-2 text-sm bg-white text-left flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="truncate">
                      {selectedLocations.length === 0
                        ? 'Select Locations...'
                        : `Locations: ${selectedLocations.join(', ')}`}
                    </span>
                    <span className="ml-2">▼</span>
                  </button>

                  {showLocationDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                      {availableLocations.map((location) => (
                        <label
                          key={location}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes(location)}
                            onChange={() => toggleLocationSelection(location)}
                            className="mr-2"
                          />
                          <span className="text-sm">{location}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Roles Section */}
              {roles.map((r) => {
                const gap = r.demand - r.supply
                const pct = Math.max(0, Math.min(100, (r.supply / Math.max(1, r.demand)) * 100))
                const isSelected = selectedRole === r.role
                return (
                  <div
                    key={r.role}
                    onClick={() => {
                      setSelectedRole(r.role)
                      // Single select - clear all and add just this one
                      setSelectedJobs([r.role])
                    }}
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
                      </div>
                    </div>
                    <div className="mt-2 h-2 w-full bg-gray-200 rounded">
                      <div className="h-2 rounded bg-blue-500" style={{ width: pct + '%' }} />
                    </div>
                  </div>
                )
              })}

              {/* Campaigns Section */}
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Active Campaigns</h3>
                <div className="space-y-2">
                  {campaigns
                    .filter(campaign => !selectedRole || campaign.jobs.includes(selectedRole))
                    .map((campaign) => {
                    let rightText = '';
                    if (campaign.endMode === 'date' && campaign.endDate) {
                      rightText = `${formatDate(campaign.startDate)} - ${formatDate(campaign.endDate)}`;
                    } else if (campaign.endMode === 'hires' && campaign.endHires) {
                      rightText = `Target: ${campaign.endHires} hires`;
                    } else if (campaign.endMode === 'budget' && campaign.endBudget) {
                      rightText = `Budget: $${campaign.endBudget.toLocaleString()}`;
                    }

                    return (
                      <div
                        key={campaign.id}
                        onClick={() => setSelectedCampaign(campaign.id === selectedCampaign?.id ? null : campaign)}
                        className={`border rounded p-2 text-xs cursor-pointer transition ${
                          selectedCampaign?.id === campaign.id
                            ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-400'
                            : campaign.status === 'active'
                            ? 'bg-green-50 border-green-200 hover:bg-green-100'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium truncate flex-1">{campaign.name}</span>
                          {campaign.status === 'active' && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-600 text-white">
                              ACTIVE
                            </span>
                          )}
                          {campaign.status === 'suspended' && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-400 text-white">
                              SUSPENDED
                            </span>
                          )}
                        </div>
                        <div className="text-gray-600 text-[11px]">{rightText}</div>
                      </div>
                    );
                  })}
                  {selectedRole && campaigns.filter(campaign => campaign.jobs.includes(selectedRole)).length === 0 && (
                    <div className="text-xs text-gray-500 italic py-2">
                      No campaigns for {selectedRole}
                    </div>
                  )}
                </div>
              </div>
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
                  <WeekGrid
                    weekMatrix={weekMatrix}
                    selectedSlots={selectedSlots}
                    selectedCampaign={selectedCampaign}
                    filteredCampaigns={campaigns.filter(campaign => campaign.status === 'active' && (!selectedRole || campaign.jobs.includes(selectedRole)))}
                    onCellMouseDown={handleCellMouseDown}
                    onCellMouseEnter={handleCellMouseEnter}
                  />
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
            <div className="rounded border bg-white p-4 text-sm text-gray-600">
              This is a placeholder for the dedicated Recruiting screen (campaign setup, sources, budget, creatives).
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WeekGrid({
  weekMatrix,
  selectedSlots,
  selectedCampaign,
  filteredCampaigns,
  onCellMouseDown,
  onCellMouseEnter
}: {
  weekMatrix: { demand: number; supply: number; closed: boolean }[][]
  selectedSlots: Set<string>
  selectedCampaign: Campaign | null
  filteredCampaigns: Campaign[]
  onCellMouseDown: (day: number, slotIndex: number) => void
  onCellMouseEnter: (day: number, slotIndex: number) => void
}) {
  // Convert campaign time ranges to slot set (with day information)
  const campaignSlots = new Set<string>()
  if (selectedCampaign?.timeRanges) {
    selectedCampaign.timeRanges.forEach(range => {
      const [startHour, startMin] = range.start.split(':').map(Number)
      const [endHour, endMin] = range.end.split(':').map(Number)
      const startSlot = startHour * 2 + (startMin === 30 ? 1 : 0)
      const endSlot = endHour * 2 + (endMin === 30 ? 1 : 0)
      const days = range.days || [0, 1, 2, 3, 4, 5, 6] // Default to all days if not specified

      days.forEach(day => {
        for (let i = startSlot; i < endSlot; i++) {
          campaignSlots.add(`${day}-${i}`)
        }
      })
    })
  }

  // Convert filtered campaigns' time ranges to slot set (for general highlighting)
  const filteredCampaignSlots = new Set<string>()
  filteredCampaigns.forEach(campaign => {
    if (campaign.timeRanges) {
      campaign.timeRanges.forEach(range => {
        const [startHour, startMin] = range.start.split(':').map(Number)
        const [endHour, endMin] = range.end.split(':').map(Number)
        const startSlot = startHour * 2 + (startMin === 30 ? 1 : 0)
        const endSlot = endHour * 2 + (endMin === 30 ? 1 : 0)
        const days = range.days || [0, 1, 2, 3, 4, 5, 6] // Default to all days if not specified

        days.forEach(day => {
          for (let i = startSlot; i < endSlot; i++) {
            filteredCampaignSlots.add(`${day}-${i}`)
          }
        })
      })
    }
  })
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
        {HALF_HOUR_SLOTS.map((slot) => {
          const slotIndex = slot.index
          const hour = Math.floor(slotIndex / 2)
          const isFullHour = slotIndex % 2 === 0
          const showLabel = isFullHour && (hour % 2 === 0) // label every 2 hours
          const hourLabel = `${hour.toString().padStart(2,'0')}:00`

          return (
            <div key={slot.time}>
              <div
                className="grid"
                style={{ gridTemplateColumns: `60px repeat(7, 1fr)`, columnGap: '2px' }}
              >
                <div className="relative h-[10px] sticky left-0 bg-white">
                  {showLabel && (
                    <span className="absolute -translate-y-2 text-[9px] leading-none text-gray-500">{hourLabel}</span>
                  )}
                </div>
                {weekMatrix.map((daySlots, dayIdx) => {
                  const { demand, supply, closed } = daySlots[slotIndex]
                  const bg = closed ? COLORS.closed : cellColor(demand, supply)
                  const cellKey = `${dayIdx}-${slotIndex}`
                  const isSelected = selectedSlots.has(cellKey)
                  const isCampaignSlot = campaignSlots.has(cellKey)
                  const isFilteredCampaignSlot = filteredCampaignSlots.has(cellKey)

                  return (
                    <div
                      key={cellKey}
                      title={`${slot.time} - D:${demand} S:${supply}${closed?' (closed)':''}`}
                      className="cursor-pointer hover:opacity-80"
                      onMouseDown={() => onCellMouseDown(dayIdx, slotIndex)}
                      onMouseEnter={() => onCellMouseEnter(dayIdx, slotIndex)}
                      style={{
                        height: '10px',
                        background: isCampaignSlot ? '#a78bfa' : isFilteredCampaignSlot ? '#86efac' : bg,
                        outline: isSelected ? '2px solid #3b82f6' : 'none',
                        outlineOffset: '-2px'
                      }}
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

