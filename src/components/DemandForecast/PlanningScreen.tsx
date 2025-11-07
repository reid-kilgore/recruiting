
import { useMemo, useState, useEffect } from "react"
import JobFormSections from "../Advertisement/JobFormSections"

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
  yellow: "#9ca3af", // Changed to grey for "ok"
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
  // Simplified to only good/ok/bad colors
  if (delta >= 0.05) return COLORS.green // good: 5%+ over
  if (delta <= -0.05) return COLORS.red // bad: 5%+ under
  return COLORS.yellow // ok: within ±5%
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

function genWeek(role: string | null, weekOffset = 0, location?: string) {
  // If no role, generate aggregate across all roles
  if (!role) {
    const allRoles = ['Cook', 'Server', 'Bartender', 'Host']
    const allData = allRoles.map(r => genWeek(r, weekOffset, location))

    // Aggregate by summing demand and supply
    return Array.from({ length: 7 }, (_, d) => (
      Array.from({ length: 48 }, (_, s) => {
        let totalDemand = 0
        let totalSupply = 0
        let anyClosed = true

        allData.forEach(roleData => {
          const cell = roleData[d][s]
          if (!cell.closed) {
            anyClosed = false
            totalDemand += cell.demand
            totalSupply += cell.supply
          }
        })

        return {
          demand: totalDemand,
          supply: totalSupply,
          closed: anyClosed
        }
      })
    ))
  }

  const base = role === "Cook" ? 10 : role === "Server" ? 8 : role === "Bartender" ? 5 : 4

  // Location-specific adjustment to match locationBreakdown percentages
  // We'll adjust supply relative to demand to create the right good/ok/bad distribution
  let supplyFactor = 0.86 // Default factor

  if (location) {
    // Location breakdown mapping to supply factors
    // Good cells need delta >= 0.05, Ok needs -0.05 < delta < 0.05, Bad needs delta <= -0.05
    const locationData: Record<string, Record<string, { good: number; ok: number; bad: number }>> = {
      'Cook': {
        'BOS': { good: 50, ok: 30, bad: 20 },
        'LGA': { good: 35, ok: 40, bad: 25 },
        'DCA': { good: 60, ok: 25, bad: 15 },
        'ORD': { good: 40, ok: 35, bad: 25 }
      },
      'Server': {
        'BOS': { good: 55, ok: 30, bad: 15 },
        'LGA': { good: 45, ok: 35, bad: 20 },
        'DCA': { good: 50, ok: 35, bad: 15 },
        'ORD': { good: 35, ok: 40, bad: 25 }
      },
      'Bartender': {
        'BOS': { good: 40, ok: 35, bad: 25 },
        'LGA': { good: 30, ok: 40, bad: 30 },
        'DCA': { good: 55, ok: 30, bad: 15 },
        'ORD': { good: 45, ok: 30, bad: 25 }
      },
      'Host': {
        'BOS': { good: 60, ok: 25, bad: 15 },
        'LGA': { good: 50, ok: 35, bad: 15 },
        'DCA': { good: 45, ok: 35, bad: 20 },
        'ORD': { good: 55, ok: 30, bad: 15 }
      }
    }

    const breakdown = locationData[role]?.[location]
    if (breakdown) {
      // Adjust supply factor based on good percentage
      // Higher good% means better supply, lower good% means worse supply
      // Target: 50% good = 1.0, 60% good = 1.1, 40% good = 0.9, etc.
      supplyFactor = 0.65 + (breakdown.good / 100) * 0.5
    }
  }

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
      // Apply location-specific supply factor
      const supply = Math.max(0, Math.round(demand * (supplyFactor + (d % 3) * 0.03) + noise(weekOffset, d, s)))
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
  status: 'active' | 'suspended' | 'draft' | 'archived';
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
  campaigns: Campaign[];
  onUpdateCampaignStatus: (campaignId: string, newStatus: 'active' | 'suspended' | 'draft' | 'archived') => void;
  onAddJobToCampaign: (campaignId: string, jobRole: string, timeRanges: TimeRange[]) => void;
  onCreateCampaign: (
    name: string,
    jobRole: string,
    locations: string[],
    timeRanges: TimeRange[],
    startDate: string,
    endMode: 'date' | 'budget' | 'hires',
    endDate?: string,
    endBudget?: number,
    endHires?: number
  ) => string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function PlanningScreen({ selectedJobs: _selectedJobs, setSelectedJobs, selectedLocations, setSelectedLocations, jobForms, setJobForms, onStartHiring, campaigns, onUpdateCampaignStatus, onAddJobToCampaign, onCreateCampaign }: PlanningScreenProps) {
  const availableLocations = ['BOS', 'LGA', 'DCA', 'ORD']
  const roles = [
    { role: "Cook", demand: 10, supply: 7 },
    { role: "Server", demand: 8, supply: 8 },
    { role: "Bartender", demand: 5, supply: 3 },
    { role: "Host", demand: 4, supply: 5 }
  ]
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [selectedLocationForRole, setSelectedLocationForRole] = useState<string | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set()) // Format: "day-slotIndex"
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartCell, setDragStartCell] = useState<{day: number, slot: number} | null>(null)
  const [viewMode, setViewMode] = useState<'week'|'month'|'year'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()) // 0..11
  const [route, setRoute] = useState<Route>('plan')
  const [showCampaignOverlay, setShowCampaignOverlay] = useState(true)
  const [isBuildingCampaign, setIsBuildingCampaign] = useState(false)
  const [heatmapCollapsed, setHeatmapCollapsed] = useState(false)

  // Location breakdown data for each role (mock data with variation)
  const locationBreakdown: Record<string, Record<string, { good: number; ok: number; bad: number }>> = {
    'Cook': {
      'BOS': { good: 50, ok: 30, bad: 20 },
      'LGA': { good: 35, ok: 40, bad: 25 },
      'DCA': { good: 60, ok: 25, bad: 15 },
      'ORD': { good: 40, ok: 35, bad: 25 }
    },
    'Server': {
      'BOS': { good: 55, ok: 30, bad: 15 },
      'LGA': { good: 45, ok: 35, bad: 20 },
      'DCA': { good: 50, ok: 35, bad: 15 },
      'ORD': { good: 35, ok: 40, bad: 25 }
    },
    'Bartender': {
      'BOS': { good: 40, ok: 35, bad: 25 },
      'LGA': { good: 30, ok: 40, bad: 30 },
      'DCA': { good: 55, ok: 30, bad: 15 },
      'ORD': { good: 45, ok: 30, bad: 25 }
    },
    'Host': {
      'BOS': { good: 60, ok: 25, bad: 15 },
      'LGA': { good: 50, ok: 35, bad: 15 },
      'DCA': { good: 45, ok: 35, bad: 20 },
      'ORD': { good: 55, ok: 30, bad: 15 }
    }
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
    if (!selectedRole) return

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
    if (!selectedRole) {
      setSelectedSlots(new Set())
      return
    }

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

  const weekMatrix = useMemo(() => genWeek(selectedRole, weekOffset, selectedLocationForRole || undefined), [selectedRole, weekOffset, selectedLocationForRole])
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
            {/* Left Panel: Roles list and Campaigns (collapsed in building mode) */}
            <div className="w-1/4 overflow-y-auto p-4 space-y-3">
              {isBuildingCampaign ? (
                /* Collapsed Sidebar - Building Mode */
                <div className="space-y-3">
                  <button
                    onClick={() => setIsBuildingCampaign(false)}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition"
                  >
                    ← Back to Planning
                  </button>

                  <div className="bg-white border rounded-xl p-4">
                    <div className="text-sm font-semibold mb-3">Posting Summary</div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-gray-500">Job:</span>
                        <span className="ml-1 font-medium">{selectedRole}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Locations:</span>
                        <span className="ml-1 font-medium">{selectedLocations.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Priority Time Ranges:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(() => {
                            const currentJobForm = jobForms.find(f => f.role === selectedRole)
                            const timeRanges = currentJobForm?.timeRanges || []
                            return timeRanges.length > 0 ? (
                              timeRanges.map((range, idx) => (
                                <span key={idx} className="px-2 py-1 text-xs font-mono rounded" style={{ backgroundColor: '#e0f5fc', color: '#009cd9' }}>
                                  {range.start} - {range.end}
                                  {range.days && range.days.length > 0 && range.days.length < 7 && (
                                    <span className="ml-1 text-[10px]">({range.days.map(d => ['M','T','W','Th','F','Sa','Su'][d]).join(',')})</span>
                                  )}
                                </span>
                              ))
                            ) : (
                              <span className="ml-1 font-medium text-gray-500">No time ranges selected</span>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Job Details Section */}
                      {(() => {
                        const currentJobForm = jobForms.find(f => f.role === selectedRole)
                        const jobData = currentJobForm?.data || {}

                        return (
                          <>
                            {jobData.description && (
                              <div className="pt-2 border-t">
                                <span className="text-gray-500">Description:</span>
                                <p className="ml-1 text-gray-700 mt-1 line-clamp-3">{jobData.description}</p>
                              </div>
                            )}

                            {jobData.skills && jobData.skills.length > 0 && (
                              <div className={jobData.description ? '' : 'pt-2 border-t'}>
                                <span className="text-gray-500">Skills:</span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {jobData.skills.map((skill: string, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 bg-blue-50 rounded text-xs" style={{ color: '#009cd9' }}>
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {jobData.pay && (
                              <div>
                                <span className="text-gray-500">Pay:</span>
                                <span className="ml-1 font-medium">{jobData.pay}</span>
                              </div>
                            )}

                            {jobData.benefits && jobData.benefits.length > 0 && (
                              <div>
                                <span className="text-gray-500">Benefits:</span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {jobData.benefits.map((benefit: string, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                                      {benefit}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                /* Full Sidebar - Planning Mode */
                <>
              {/* Start Hiring Button - always visible, disabled until conditions met */}
              {onStartHiring && (() => {
                const hasTimeRanges = jobForms.some(job => job.timeRanges && job.timeRanges.length > 0)
                const hasRole = selectedRole !== null
                const hasLocations = selectedLocations.length > 0
                const canStart = hasTimeRanges && hasRole && hasLocations

                let buttonText = 'Start Hiring'
                if (!canStart) {
                  if (!hasRole || !hasLocations) {
                    buttonText = hasRole ? 'Select locations first' : 'Select a job first'
                  } else if (!hasTimeRanges) {
                    buttonText = 'Select hours to continue'
                  }
                }

                return (
                  <button
                    onClick={() => setIsBuildingCampaign(true)}
                    disabled={!canStart}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      canStart
                        ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {buttonText}
                  </button>
                )
              })()}

              {/* Roles Section */}
              {roles.map((r) => {
                const isSelected = selectedRole === r.role
                const isExpanded = expandedRole === r.role
                // Calculate good/ok/bad percentages (mock values for now)
                const goodPct = 45
                const okPct = 35
                const badPct = 20
                return (
                  <div
                    key={r.role}
                    className={`border rounded overflow-hidden transition ${
                      isSelected ? 'bg-blue-50' : 'bg-white'
                    }`}
                    style={selectedRole === r.role ? {
                      borderColor: '#009cd9',
                      boxShadow: '0 0 0 2px #009cd9'
                    } : {}}
                  >
                    {/* Main role card */}
                    <div
                      onClick={() => {
                        setSelectedRole(r.role)
                        setSelectedJobs([r.role])
                        setExpandedRole(isExpanded ? null : r.role)
                        if (!isExpanded) {
                          // Auto-select first location when expanding a role
                          const firstLocation = availableLocations.find(loc => locationBreakdown[r.role]?.[loc])
                          setSelectedLocationForRole(firstLocation || null)
                        } else {
                          setSelectedLocationForRole(null)
                        }
                      }}
                      className="p-3 cursor-pointer hover:shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{r.role}</div>
                        <div className="text-xs text-gray-500">{isExpanded ? '▼' : '▶'}</div>
                      </div>
                      {/* Three-color progress bar */}
                      <div className="mt-2 h-2 w-full bg-gray-200 rounded flex overflow-hidden">
                        <div className="h-2" style={{ width: `${goodPct}%`, background: '#8ace00' }} />
                        <div className="h-2" style={{ width: `${okPct}%`, background: '#6c6c6c' }} />
                        <div className="h-2" style={{ width: `${badPct}%`, background: '#d20011' }} />
                      </div>
                    </div>

                    {/* Location breakdown (when expanded) */}
                    {isExpanded && locationBreakdown[r.role] && (
                      <div className="border-t bg-gray-50">
                        {availableLocations.map(loc => {
                          const data = locationBreakdown[r.role][loc]
                          if (!data) return null
                          const isLocationSelected = selectedLocationForRole === loc && selectedRole === r.role
                          const isChecked = selectedLocations.includes(loc)
                          return (
                            <div
                              key={loc}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedRole(r.role)
                                setSelectedJobs([r.role])
                                setSelectedLocationForRole(isLocationSelected ? null : loc)
                              }}
                              className={`px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition`}
                              style={isLocationSelected ? { backgroundColor: '#e0f5fc', borderLeft: '4px solid #009cd9', paddingLeft: '8px' } : {}}
                            >
                              {/* Checkbox for global location selection */}
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  toggleLocationSelection(loc)
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 border-gray-300 rounded focus:ring-2 cursor-pointer"
                                style={{ accentColor: '#009cd9' }}
                              />
                              <div className="text-sm font-medium flex-1">{loc}</div>
                              <div className="h-2 w-20 rounded flex overflow-hidden">
                                <div className="h-2" style={{ width: `${data.good}%`, background: '#8ace00' }} />
                                <div className="h-2" style={{ width: `${data.ok}%`, background: '#6c6c6c' }} />
                                <div className="h-2" style={{ width: `${data.bad}%`, background: '#d20011' }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
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
                        <div className="text-gray-600 text-[11px] mb-2">{rightText}</div>
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
                </>
              )}
            </div>

            {/* Right Panel: Details + Heatmap OR Building Mode */}
            <div className="w-3/4 border-l bg-white p-4 flex flex-col overflow-hidden">
              {isBuildingCampaign ? (
                /* Building Mode */
                <div className="flex-1 overflow-auto space-y-4">
                  {/* Job Posting Form */}
                  <JobFormSections
                    jobRole={selectedRole || ''}
                    timeRanges={jobForms.find(f => f.role === selectedRole)?.timeRanges || []}
                    selectedLocations={selectedLocations}
                    jobFormData={jobForms.find(f => f.role === selectedRole)?.data || {}}
                    campaigns={campaigns}
                    onAddJobToCampaign={(campaignId) => {
                      if (selectedRole) {
                        const timeRanges = jobForms.find(f => f.role === selectedRole)?.timeRanges || [];
                        onAddJobToCampaign(campaignId, selectedRole, timeRanges);
                      }
                    }}
                    onCreateCampaign={(name, startDate, endMode, endDate, endBudget, endHires) => {
                      if (selectedRole) {
                        const timeRanges = jobForms.find(f => f.role === selectedRole)?.timeRanges || [];
                        const campaignId = onCreateCampaign(
                          name,
                          selectedRole,
                          selectedLocations,
                          timeRanges,
                          startDate,
                          endMode,
                          endDate,
                          endBudget,
                          endHires
                        );
                        return campaignId;
                      }
                      return '';
                    }}
                    onUpdateJobData={(data) => {
                      // Update job form data
                      if (selectedRole) {
                        setJobForms(prev => prev.map(f =>
                          f.role === selectedRole ? { ...f, data: { ...f.data, ...data } } : f
                        ))
                      }
                    }}
                    onComplete={() => {
                      // Mark job as completed
                      if (selectedRole) {
                        setJobForms(prev => prev.map(f =>
                          f.role === selectedRole ? { ...f, completed: true } : f
                        ))
                      }
                    }}
                    onFinalize={(jobRole) => {
                      // This will be handled by the buttons in JobFormSections
                      console.log('Job posting ready for campaign:', jobRole)
                    }}
                    onNavigateToCampaign={() => {
                      if (onStartHiring) {
                        onStartHiring()
                      }
                    }}
                  />
                </div>
              ) : (
                /* Planning Mode Heatmap */
                <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">{selectedRole || 'All Roles'} — Coverage Heatmap</h2>
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
                  <button
                    onClick={()=>setShowCampaignOverlay(!showCampaignOverlay)}
                    className={`ml-2 px-2 py-1 border rounded text-xs ${showCampaignOverlay ? 'bg-purple-600 text-white' : 'bg-white'}`}
                  >
                    {showCampaignOverlay ? 'Hide' : 'Show'} Campaign Targets </button>
                  <button
                    onClick={()=>setHeatmapCollapsed(!heatmapCollapsed)}
                    className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-100"
                  >
                    {heatmapCollapsed ? 'Expand' : 'Collapse'}
                  </button>
                </div>
              </div>

              {/* Suggested Priority Time Ranges */}
              {selectedRole && (() => {
                // Find the worst time slots based on heatmap data (RED cells)
                // Analyze weekMatrix to find cells where supply is significantly below demand
                const redCells: { day: number; slot: number; severity: number }[] = [];
                weekMatrix.forEach((dayData, dayIdx) => {
                  dayData.forEach((cell, slotIdx) => {
                    if (!cell.closed && cell.demand > 0) {
                      const delta = (cell.supply - cell.demand) / cell.demand;
                      if (delta <= -0.05) { // Red threshold
                        redCells.push({ day: dayIdx, slot: slotIdx, severity: -delta });
                      }
                    }
                  });
                });

                // Sort by severity (worst first)
                redCells.sort((a, b) => b.severity - a.severity);

                // Group into time ranges by finding contiguous blocks per day
                const suggestions: { start: string; end: string; days: number[]; label: string; slots: number[][]; severity: number }[] = [];

                // Group red cells by day
                const cellsByDay: Record<number, number[]> = {};
                redCells.forEach(({ day, slot }) => {
                  if (!cellsByDay[day]) cellsByDay[day] = [];
                  if (!cellsByDay[day].includes(slot)) cellsByDay[day].push(slot);
                });

                // Find contiguous ranges within each day
                Object.entries(cellsByDay).forEach(([dayStr, slots]) => {
                  const day = Number(dayStr);
                  slots.sort((a, b) => a - b);

                  let rangeStart = slots[0];
                  let rangeEnd = slots[0];

                  for (let i = 1; i <= slots.length; i++) {
                    const slot = slots[i];
                    if (slot === rangeEnd + 1) {
                      rangeEnd = slot;
                    } else {
                      // End of contiguous range, create suggestion
                      if (rangeEnd - rangeStart >= 3) { // At least 2 hours (4 slots)
                        const startTime = `${String(Math.floor(rangeStart / 2)).padStart(2, '0')}:${rangeStart % 2 === 0 ? '00' : '30'}`;
                        const endTime = `${String(Math.floor((rangeEnd + 1) / 2)).padStart(2, '0')}:${(rangeEnd + 1) % 2 === 0 ? '00' : '30'}`;
                        const avgSeverity = slots.slice(slots.indexOf(rangeStart), slots.indexOf(rangeEnd) + 1).reduce((sum, s) => {
                          const cell = redCells.find(rc => rc.day === day && rc.slot === s);
                          return sum + (cell?.severity || 0);
                        }, 0) / (rangeEnd - rangeStart + 1);

                        suggestions.push({
                          start: startTime,
                          end: endTime,
                          days: [day],
                          label: `${DAYS[day]} ${startTime}-${endTime}`,
                          slots: [[day, rangeStart, rangeEnd]],
                          severity: avgSeverity
                        });
                      }
                      rangeStart = slot;
                      rangeEnd = slot;
                    }
                  }
                });

                // Try to merge similar time ranges across days
                const mergedSuggestions: typeof suggestions = [];
                suggestions.forEach(sug => {
                  const existing = mergedSuggestions.find(m =>
                    m.start === sug.start && m.end === sug.end
                  );
                  if (existing) {
                    existing.days.push(sug.days[0]);
                    existing.slots.push(sug.slots[0]);
                    existing.severity = (existing.severity + sug.severity) / 2;
                  } else {
                    mergedSuggestions.push({ ...sug });
                  }
                });

                // Sort by severity and take top 3 (we'll add "All Times" separately)
                mergedSuggestions.sort((a, b) => b.severity - a.severity);
                const topSuggestions = mergedSuggestions.slice(0, 3);

                // Update labels for merged ranges
                topSuggestions.forEach(sug => {
                  sug.days.sort((a, b) => a - b);
                  if (sug.days.length === 7) {
                    sug.label = `All Week ${sug.start}-${sug.end}`;
                  } else if (sug.days.length === 5 && sug.days[0] === 0 && sug.days[4] === 4) {
                    sug.label = `Mon-Fri ${sug.start}-${sug.end}`;
                  } else if (sug.days.length === 2 && sug.days[0] === 5 && sug.days[1] === 6) {
                    sug.label = `Weekend ${sug.start}-${sug.end}`;
                  } else if (sug.days.length > 1) {
                    sug.label = `${DAYS[sug.days[0]]}-${DAYS[sug.days[sug.days.length - 1]]} ${sug.start}-${sug.end}`;
                  }
                });

                // Add "All Times" option
                const allTimesSuggestion = {
                  start: '08:00',
                  end: '23:30',
                  days: [0, 1, 2, 3, 4, 5, 6],
                  label: 'All Times',
                  slots: [[0,16,47],[1,16,47],[2,16,47],[3,16,47],[4,16,47],[5,16,47],[6,16,47]],
                  severity: 0
                };

                // Helper to check if a suggestion is currently selected
                const isSuggestionSelected = (suggestion: typeof topSuggestions[0]) => {
                  return suggestion.slots.every(([day, startSlot, endSlot]) => {
                    for (let slot = startSlot; slot <= endSlot; slot++) {
                      if (!selectedSlots.has(`${day}-${slot}`)) return false;
                    }
                    return true;
                  });
                };

                const handleSuggestionClick = (suggestion: typeof topSuggestions[0]) => {
                  const isSelected = isSuggestionSelected(suggestion);
                  const newSlots = new Set(selectedSlots);

                  if (isSelected) {
                    // Deselect: remove these slots
                    suggestion.slots.forEach(([day, startSlot, endSlot]) => {
                      for (let slot = startSlot; slot <= endSlot; slot++) {
                        newSlots.delete(`${day}-${slot}`);
                      }
                    });
                    // Remove from timeRanges
                    setJobForms(prev => prev.map(f =>
                      f.role === selectedRole
                        ? { ...f, timeRanges: (f.timeRanges || []).filter(r =>
                            r.start !== suggestion.start || r.end !== suggestion.end ||
                            JSON.stringify(r.days) !== JSON.stringify(suggestion.days)
                          )}
                        : f
                    ));
                  } else {
                    // Select: add these slots
                    suggestion.slots.forEach(([day, startSlot, endSlot]) => {
                      for (let slot = startSlot; slot <= endSlot; slot++) {
                        newSlots.add(`${day}-${slot}`);
                      }
                    });
                    // Add to timeRanges
                    const currentJobForm = jobForms.find(f => f.role === selectedRole);
                    const existingRanges = currentJobForm?.timeRanges || [];
                    const newRange = { start: suggestion.start, end: suggestion.end, days: suggestion.days };
                    setJobForms(prev => prev.map(f =>
                      f.role === selectedRole
                        ? { ...f, timeRanges: [...existingRanges, newRange] }
                        : f
                    ));
                  }
                  setSelectedSlots(newSlots);
                };

                return (
                  <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      {topSuggestions.length > 0 ? 'Suggested Priority Time Ranges (Based on High Demand):' : 'Quick Time Range Selection:'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* All Times - neutral default button */}
                      <button
                        onClick={() => handleSuggestionClick(allTimesSuggestion)}
                        className={`px-3 py-1 border rounded text-xs font-medium transition ${
                          isSuggestionSelected(allTimesSuggestion)
                            ? 'bg-gray-700 border-gray-700 text-white'
                            : 'bg-white border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-semibold">All Times</div>
                        <div className="text-[10px] opacity-75">08:00 - 23:30</div>
                      </button>
                      {/* Data-driven suggestions */}
                      {topSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`px-3 py-1 border rounded text-xs font-medium transition ${
                            isSuggestionSelected(suggestion)
                              ? 'bg-red-600 border-red-600 text-white'
                              : 'bg-white border-red-300 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          <div className="font-semibold">{suggestion.start} - {suggestion.end}</div>
                          <div className="text-[10px] opacity-75">{suggestion.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Views */}
              <div className={`flex-1 overflow-auto ${heatmapCollapsed ? 'hidden' : ''}`}>
                {viewMode === 'week' && (
                  <WeekGrid
                    weekMatrix={weekMatrix}
                    selectedSlots={selectedSlots}
                    selectedCampaign={selectedCampaign}
                    filteredCampaigns={campaigns.filter(campaign => campaign.status === 'active' && (!selectedRole || campaign.jobs.includes(selectedRole)))}
                    onCellMouseDown={handleCellMouseDown}
                    onCellMouseEnter={handleCellMouseEnter}
                    showCampaignOverlay={showCampaignOverlay}
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

              {/* Campaign Target Section - shown when a campaign is selected */}
              {selectedCampaign && (
                <div className="mt-4 bg-white border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Campaign Target</div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      selectedCampaign.status === 'active' ? 'bg-green-100 text-green-700' :
                      selectedCampaign.status === 'suspended' ? 'bg-gray-100 text-gray-600' :
                      'text-white'
                    }`}
                    style={selectedCampaign.status === 'draft' ? { backgroundColor: '#009cd9' } : {}}>
                      {selectedCampaign.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Before/Target Visualization with Info */}
                  <div className="flex gap-4">
                    {/* Vertical Bars */}
                    <div className="flex items-end gap-3">
                      {/* Before Bar */}
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">Before</div>
                        <div className="w-12 h-24 rounded flex flex-col overflow-hidden shadow">
                          <div className="w-full" style={{ height: '40%', background: '#8ace00' }} />
                          <div className="w-full" style={{ height: '35%', background: '#9ca3af' }} />
                          <div className="w-full" style={{ height: '25%', background: '#d20011' }} />
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="text-2xl text-gray-400 pb-8">→</div>

                      {/* Target Bar */}
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">Target</div>
                        <div className="w-12 h-24 rounded flex flex-col overflow-hidden shadow">
                          <div className="w-full" style={{ height: '70%', background: '#8ace00' }} />
                          <div className="w-full" style={{ height: '25%', background: '#9ca3af' }} />
                          <div className="w-full" style={{ height: '5%', background: '#d20011' }} />
                        </div>
                      </div>
                    </div>

                    {/* Campaign Details */}
                    <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-gray-500">Campaign:</span>
                          <span className="ml-1 font-medium">{selectedCampaign.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Start:</span>
                          <span className="ml-1 font-medium">{formatDate(selectedCampaign.startDate)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">End Goal:</span>
                          <span className="ml-1 font-medium">
                            {selectedCampaign.endMode === 'date' && selectedCampaign.endDate && formatDate(selectedCampaign.endDate)}
                            {selectedCampaign.endMode === 'budget' && `$${selectedCampaign.endBudget?.toLocaleString()}`}
                            {selectedCampaign.endMode === 'hires' && `${selectedCampaign.endHires} hires`}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Locations:</span>
                          <span className="ml-1 font-medium">{selectedCampaign.locations.join(', ')}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Jobs:</span>
                          <span className="ml-1 font-medium">{selectedCampaign.jobs.join(', ')}</span>
                        </div>
                      </div>

                      {/* Time Ranges */}
                      {selectedCampaign.timeRanges && selectedCampaign.timeRanges.length > 0 && (
                        <div className="border-t pt-2 mt-2">
                          <div className="text-xs text-gray-500 mb-1">Time Ranges:</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedCampaign.timeRanges.map((range, idx) => (
                              <span key={idx} className="px-2 py-1 text-xs font-mono rounded" style={{ backgroundColor: '#e0f5fc', color: '#009cd9' }}>
                                {range.start} - {range.end}
                                {range.days && range.days.length > 0 && range.days.length < 7 && (
                                  <span className="ml-1 text-[10px]">({range.days.map(d => ['M','T','W','Th','F','Sa','Su'][d]).join(',')})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        if (onStartHiring) {
                          onStartHiring();
                        }
                      }}
                      className="flex-1 px-3 py-2 text-sm rounded font-medium transition text-white"
                      style={{ backgroundColor: '#009cd9' }}
                    >
                      View
                    </button>
                    {selectedCampaign.status !== 'archived' && (
                      <>
                        <button
                          onClick={() => {
                            const newStatus = selectedCampaign.status === 'active' ? 'suspended' : 'active';
                            onUpdateCampaignStatus(selectedCampaign.id, newStatus);
                          }}
                          className={`flex-1 px-3 py-2 text-sm rounded font-medium transition ${
                            selectedCampaign.status === 'active'
                              ? 'bg-orange-600 text-white hover:bg-orange-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {selectedCampaign.status === 'active' ? 'Suspend' : 'Launch'}
                        </button>
                        <button
                          onClick={() => {
                            onUpdateCampaignStatus(selectedCampaign.id, 'archived');
                          }}
                          className="flex-1 px-3 py-2 text-sm rounded font-medium transition bg-gray-600 text-white hover:bg-gray-700"
                        >
                          Archive
                        </button>
                      </>
                    )}
                    {selectedCampaign.status === 'archived' && (
                      <button
                        onClick={() => {
                          // Copy campaign logic would go here
                          alert('Copy as New Campaign - to be implemented');
                        }}
                        className="flex-1 px-3 py-2 text-sm rounded font-medium transition bg-purple-600 text-white hover:bg-purple-700"
                      >
                        Copy as New Campaign
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Campaign Builder - shown when selecting time slots */}
              {selectedSlots.size > 0 && !selectedCampaign && (
                <div className="mt-4 bg-white border rounded-xl p-4">
                  <div className="text-sm font-semibold mb-3">Campaign Preview</div>

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-gray-500">Job:</span>
                        <span className="ml-1 font-medium">{selectedRole || 'None selected'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Locations:</span>
                        <span className="ml-1 font-medium">
                          {selectedLocations.length > 0 ? selectedLocations.join(', ') : 'None selected'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Time Ranges:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(() => {
                            const timeRanges = convertSlotsToTimeRanges(selectedSlots)
                            return timeRanges.length > 0 ? (
                              timeRanges.map((range, idx) => (
                                <span key={idx} className="px-2 py-1 text-xs font-mono rounded" style={{ backgroundColor: '#e0f5fc', color: '#009cd9' }}>
                                  {range.start} - {range.end}
                                  {range.days && range.days.length > 0 && range.days.length < 7 && (
                                    <span className="ml-1 text-[10px]">({range.days.map(d => ['M','T','W','Th','F','Sa','Su'][d]).join(',')})</span>
                                  )}
                                </span>
                              ))
                            ) : (
                              <span className="ml-1 font-medium text-gray-500">Selecting...</span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <TestPanel />
                </>
              )}
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
  onCellMouseEnter,
  showCampaignOverlay
}: {
  weekMatrix: { demand: number; supply: number; closed: boolean }[][]
  selectedSlots: Set<string>
  selectedCampaign: Campaign | null
  filteredCampaigns: Campaign[]
  onCellMouseDown: (day: number, slotIndex: number) => void
  onCellMouseEnter: (day: number, slotIndex: number) => void
  showCampaignOverlay: boolean
}) {
  // Calculate merged selection rectangles for each day
  const selectionRects: Array<{ day: number; startSlot: number; endSlot: number }> = []

  for (let day = 0; day < 7; day++) {
    const dayCells: number[] = []
    selectedSlots.forEach(key => {
      const [d, s] = key.split('-').map(Number)
      if (d === day) dayCells.push(s)
    })
    dayCells.sort((a, b) => a - b)

    // Merge consecutive slots
    if (dayCells.length > 0) {
      let rangeStart = dayCells[0]
      let rangeEnd = dayCells[0]

      for (let i = 1; i <= dayCells.length; i++) {
        if (i < dayCells.length && dayCells[i] === rangeEnd + 1) {
          rangeEnd = dayCells[i]
        } else {
          selectionRects.push({ day, startSlot: rangeStart, endSlot: rangeEnd })
          if (i < dayCells.length) {
            rangeStart = dayCells[i]
            rangeEnd = dayCells[i]
          }
        }
      }
    }
  }

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
    <div className="min-w-[720px] relative">
      {/* Column headers with 2px gaps between day columns */}
      <div className="grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)`, columnGap: '2px' }}>
        <div className="text-[10px] text-gray-500 p-1"></div>
        {DAYS.map(d => (
          <div key={d} className="text-[11px] font-medium text-center p-1 sticky top-0 bg-white border-b">{d}</div>
        ))}
      </div>
      {/* Rows: 10px data row + 2px separator row per half-hour */}
      <div className="max-h-[520px] overflow-auto relative">
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
                  const isCampaignSlot = campaignSlots.has(cellKey)
                  const isFilteredCampaignSlot = filteredCampaignSlots.has(cellKey)

                  // Use diagonal split for both selected campaign and filtered campaigns
                  const showDiagonalSplit = showCampaignOverlay && isFilteredCampaignSlot
                  const showCampaignDiagonalSplit = isCampaignSlot

                  return (
                    <div
                      key={cellKey}
                      title={`${slot.time} - D:${demand} S:${supply}${closed?' (closed)':''}`}
                      className="cursor-pointer hover:opacity-80"
                      onMouseDown={() => onCellMouseDown(dayIdx, slotIndex)}
                      onMouseEnter={() => onCellMouseEnter(dayIdx, slotIndex)}
                      style={{
                        height: '10px',
                        background: showCampaignDiagonalSplit ?
                          `linear-gradient(45deg, ${bg} 0%, ${bg} 50%, #009cd9 50%, #009cd9 100%)` :
                          showDiagonalSplit ?
                          `linear-gradient(45deg, ${bg} 0%, ${bg} 50%, #86efac 50%, #86efac 100%)` : bg,
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

        {/* Render merged selection rectangles as overlays */}
        {selectionRects.map((rect, idx) => {
          // Calculate position and size
          // Each slot is 10px tall + 2px separator = 12px per slot
          // Starting offset: first visible slot is index 16 (8am)
          const startIdx = HALF_HOUR_SLOTS.findIndex(s => s.index === rect.startSlot)
          const endIdx = HALF_HOUR_SLOTS.findIndex(s => s.index === rect.endSlot)
          if (startIdx === -1 || endIdx === -1) return null

          const top = startIdx * 12 // 12px per slot (10px cell + 2px separator)
          const height = (endIdx - startIdx + 1) * 12 - 2 // -2 to not include bottom separator

          return (
            <div
              key={`selection-${idx}`}
              className="absolute pointer-events-none"
              style={{
                top: `${top}px`,
                left: `calc(60px + ${rect.day} * (100% - 60px) / 7 + ${rect.day} * 2px)`,
                width: `calc((100% - 60px) / 7)`,
                height: `${height}px`,
                border: '4px solid #a855f7',
                borderRadius: '4px',
                backgroundColor: 'rgba(168, 85, 247, 0.25)',
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4) 5px, transparent 5px, transparent 10px)',
                boxShadow: '0 0 12px rgba(168, 85, 247, 0.6), inset 0 0 20px rgba(168, 85, 247, 0.2)',
                boxSizing: 'border-box',
                zIndex: 10
              }}
            />
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

