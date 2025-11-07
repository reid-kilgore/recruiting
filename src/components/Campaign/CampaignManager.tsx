import React, { useMemo, useState } from "react";

// ===============================
// Campaign Manager – compact, robust single file (JSX only)
// ===============================

// ---- helpers
const SRC_COLOR: Record<string, string> = {
  indeed: '#2563eb',
  facebook: '#16a34a',
  craigslist: '#f59e0b',
  referrals: '#7c3aed',
  qr_posters: '#dc2626',
};
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const safeISO = (d: Date | string | number) => {
  const now = new Date();
  let dt: Date;
  if (d instanceof Date) dt = d;
  else if (typeof d === 'string' || typeof d === 'number') dt = new Date(d);
  else dt = now;
  if (Number.isNaN(dt.getTime())) dt = now;
  return dt.toISOString().slice(0, 10);
};
const isoDate = (d: Date | string | number) => safeISO(d);

// Fix timezone issue: parse ISO date string as local date, not UTC
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format date for display without timezone shifts
const formatDate = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

interface TimeRange {
  start: string;
  end: string;
  days?: number[]; // Array of day indices (0=Mon, 1=Tue, etc.)
}

interface Source {
  key: string;
  enabled: boolean;
  dailyCap: number;
  dailyBudget: number;
  cpa: number;
}

interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  sources: Source[];
  status: 'active' | 'suspended' | 'draft' | 'archived';
  locations: string[];
  jobs: string[];
  startDate: string;
  endDate?: string;
  endBudget?: number;
  endHires?: number;
  endMode: 'date' | 'budget' | 'hires' | 'staffing';
  targetStaffing?: { good: number; ok: number; bad: number };
  timeRanges?: TimeRange[];
}

// ---- demo data
const DEFAULT_SOURCES: Source[] = [
  { key: 'indeed',     enabled: true,  dailyCap: 40, dailyBudget: 300, cpa: 18.43 },
  { key: 'facebook',   enabled: true,  dailyCap: 35, dailyBudget: 250, cpa: 23.12 },
  { key: 'craigslist', enabled: true,  dailyCap: 14, dailyBudget:  65, cpa: 12.40 },
  { key: 'referrals',  enabled: true,  dailyCap: 12, dailyBudget:  55, cpa:  6.25 },
  { key: 'qr_posters', enabled: false, dailyCap:  0, dailyBudget:   0, cpa:  0.00 },
];

const applicantsPerDay = (s: Source) => {
  if (!s.enabled || s.cpa <= 0 || s.dailyBudget <= 0) return 0;
  const est = s.dailyBudget / s.cpa;
  return s.dailyCap > 0 ? Math.min(est, s.dailyCap) : est;
};

interface Advertisement {
  id: string;
  role: string;
  locations: string[];
  timeRanges: TimeRange[];
  formData: any;
  companyData: any;
  finalizedAt: string;
}

interface CampaignManagerProps {
  selectedLocations: string[];
  setSelectedLocations: (locations: string[]) => void;
  selectedJobs: string[];
  setSelectedJobs: (jobs: string[]) => void;
  advertisements: Advertisement[];
  openNewCampaignModal: boolean;
  setOpenNewCampaignModal: (open: boolean) => void;
  campaigns: Campaign[];
  onUpdateCampaigns: (campaigns: Campaign[]) => void;
}

export default function CampaignManager({ selectedLocations: _selectedLocations, setSelectedLocations, selectedJobs: _selectedJobs, setSelectedJobs, advertisements, openNewCampaignModal, setOpenNewCampaignModal, campaigns: campaignsFromParent, onUpdateCampaigns }: CampaignManagerProps){
  // Ensure all campaigns have sources data, add DEFAULT_SOURCES if missing
  const campaigns = useMemo(() => {
    return campaignsFromParent.map(c => ({
      ...c,
      sources: (c as any).sources || DEFAULT_SOURCES
    })).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [campaignsFromParent]);

  const setCampaigns = (updater: React.SetStateAction<Campaign[]>) => {
    const newCampaigns = typeof updater === 'function' ? updater(campaigns) : updater;
    onUpdateCampaigns(newCampaigns);
  };

  const [activeId, setActiveId] = useState(campaigns[0]?.id);
  const current = campaigns.find(c=>c.id===activeId) || campaigns[0];

  const handleSelectCampaign = (campaign: Campaign) => {
    setActiveId(campaign.id);
    // Update global selections
    setSelectedLocations(campaign.locations);
    setSelectedJobs(campaign.jobs);
  };

  // Default date range: today → +27 days
  const today = new Date();
  const fourWeeksOut = new Date(today); fourWeeksOut.setDate(today.getDate()+27);
  const [dateRange] = useState(()=>({ start: isoDate(today), end: isoDate(fourWeeksOut) }));

  // build daily series for chart
  const days = useMemo(()=>{
    const s = parseLocalDate(dateRange.start);
    const e = parseLocalDate(dateRange.end);
    const ms = Math.max(0, (e.getTime() - s.getTime()));
    return Math.max(1, Math.floor(ms/(24*60*60*1000)) + 1);
  }, [dateRange.start, dateRange.end]);

  const dailySeries = useMemo(()=>{
    const start = parseLocalDate(dateRange.start);
    const arr: any[] = [];
    const crest = (i: number, n: number, k: number)=>{
      const t = n<=1? 0 : i/(n-1);
      const base = 0.85 + 0.35 * Math.sin(Math.PI * t);
      const wobble = 0.05 * Math.sin(2*Math.PI*(t + k*0.17));
      return clamp(base + wobble, 0.7, 1.35);
    };
    for (let i=0;i<days;i++){
      const d = new Date(start);
      d.setDate(start.getDate()+i);
      const dateLabel = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; // MM-DD
      const wd = d.toLocaleDateString(undefined,{weekday:'short'});
      const baseBy: Record<string, number> = {indeed:0,facebook:0,craigslist:0,referrals:0,qr_posters:0};
      (current?.sources||[]).forEach(s=> { baseBy[s.key] = applicantsPerDay(s); });
      const by = {
        indeed:     round2(baseBy.indeed    * crest(i,days,0)),
        facebook:   round2(baseBy.facebook  * crest(i,days,1)),
        craigslist: round2(baseBy.craigslist* crest(i,days,2)),
        referrals:  round2(baseBy.referrals * crest(i,days,3)),
        qr_posters: round2(baseBy.qr_posters* crest(i,days,4)),
      };
      arr.push({ day:i, date: dateLabel, weekday: wd, bySource: by });
    }
    return arr;
  }, [dateRange.start, dateRange.end, current, days]);

  const totalApplicantsInt = Math.round(sum(dailySeries.map(d=> sum(Object.values(d.bySource)))));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4">
        {/* LEFT */}
        <div className="col-span-12 md:col-span-5 lg:col-span-4">
          <CampaignsWindow
            campaigns={campaigns}
            activeId={activeId}
            setActiveId={setActiveId}
            setCampaigns={setCampaigns}
            onSelectCampaign={handleSelectCampaign}
            advertisements={advertisements}
            selectedJobs={_selectedJobs}
            selectedLocations={_selectedLocations}
            showNewCampaignModal={openNewCampaignModal}
            setShowNewCampaignModal={setOpenNewCampaignModal}
          />
        </div>

        {/* RIGHT: Sources + Chart */}
        <div className="col-span-12 md:col-span-7 lg:col-span-8 space-y-4">
          {/* Campaign Target */}
          {current && (
            <div className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">Campaign Target</div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    current.status === 'active' ? 'bg-green-100 text-green-700' :
                    current.status === 'suspended' ? 'bg-gray-100 text-gray-600' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {current.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Campaign Info */}
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Campaign:</span>
                    <span className="ml-1 font-medium">{current.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Start:</span>
                    <span className="ml-1 font-medium">{formatDate(current.startDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">End Goal:</span>
                    <span className="ml-1 font-medium">
                      {current.endMode === 'date' && current.endDate && formatDate(current.endDate)}
                      {current.endMode === 'budget' && `$${current.endBudget?.toLocaleString()}`}
                      {current.endMode === 'hires' && `${current.endHires} hires`}
                      {current.endMode === 'staffing' && current.targetStaffing && `${current.targetStaffing.good}% good staffing`}
                    </span>
                  </div>                  <div>
                    <span className="text-gray-500">Daily Budget:</span>
                    <span className="ml-1 font-medium">
                      ${sum((current.sources || []).filter(s => s.enabled).map(s => s.dailyBudget)).toFixed(0)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Active Sources:</span>
                    <span className="ml-1 font-medium">
                      {(current.sources || []).filter(s => s.enabled).map(s => s.key).join(', ') || 'None'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {current.jobs.map((jobRole) => {
                  const ad = advertisements.find(a => a.role === jobRole);
                  const enabledSources = (current.sources || []).filter(s => s.enabled);
                  const dailyApps = sum(enabledSources.map(s => applicantsPerDay(s)));

                  return (
                    <div key={jobRole} className="border rounded-lg p-3 bg-white">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{jobRole}</h3>
                            {ad && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                                AD
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {current.locations.join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600">{Math.round(dailyApps)}</div>
                          <div className="text-[10px] text-gray-500">apps/day</div>
                        </div>
                      </div>

                      {/* Company Info from Ad */}
                      {ad?.companyData && (
                        <div className="mb-2 pb-2 border-b border-gray-100">
                          <div className="text-xs text-gray-600 line-clamp-2">{ad.companyData.description}</div>
                          {ad.companyData.culture && ad.companyData.culture.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ad.companyData.culture.map((c: string, idx: number) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Time Ranges */}
                      {current.timeRanges && current.timeRanges.length > 0 && (
                        <div className="mb-2">
                          <div className="text-[10px] text-gray-500 mb-1">Priority Time Ranges:</div>
                          <div className="flex flex-wrap gap-1">
                            {current.timeRanges.map((range, idx) => {
                              const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                              const daysStr = range.days && range.days.length > 0 && range.days.length < 7
                                ? range.days.map(d => DAYS[d]).join(',')
                                : 'All';
                              return (
                                <span key={idx} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-mono">
                                  {range.start}-{range.end} ({daysStr})
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Ad metadata */}
                      {ad && (
                        <div className="text-[10px] text-gray-400">
                          Ad created {new Date(ad.finalizedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Campaign Details Controls */}
          {current && (
            <div className="bg-white border rounded-xl p-4">
              <div className="text-sm font-semibold mb-3">Campaign Details</div>

              {/* Row 1: Name and Start Date */}
              <div className="grid grid-cols-12 gap-3 mb-3">
                <div className="col-span-7">
                  <Field label="Campaign Name" active={true}>
                    <input
                      value={current.name}
                      onChange={e => {
                        const newName = e.target.value;
                        setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, name: newName } : c));
                      }}
                      className={inputBase}
                    />
                  </Field>
                </div>
                <div className="col-span-5">
                  <Field label="Start Date" active={true}>
                    <input
                      type="date"
                      value={current.startDate}
                      onChange={e => {
                        const newDate = e.target.value;
                        setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, startDate: newDate } : c));
                      }}
                      className={inputBase}
                    />
                  </Field>
                </div>
              </div>

              {/* Row 2: End Criteria */}
              <div className="mb-3">
                <div className="text-xs text-gray-600 mb-2">Campaign End Criteria</div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Budget */}
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="Budget radio"
                      type="radio"
                      name="endMode"
                      checked={current.endMode === 'budget'}
                      onChange={() => setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, endMode: 'budget' } : c))}
                      className={current.endMode === 'budget' ? 'accent-black shrink-0' : 'accent-gray-400 shrink-0'}
                    />
                    <div className={`flex-1 ${current.endMode === 'budget' ? '' : 'opacity-60'}`}>
                      <Field label="Budget" active={current.endMode === 'budget'}>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={current.endBudget || 1000}
                          onChange={e => {
                            const val = Math.max(0, Math.floor(Number(e.target.value || 0)));
                            setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, endBudget: val } : c));
                          }}
                          disabled={current.endMode !== 'budget'}
                          className={inputBase}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Hires */}
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="Hires radio"
                      type="radio"
                      name="endMode"
                      checked={current.endMode === 'hires'}
                      onChange={() => setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, endMode: 'hires' } : c))}
                      className={current.endMode === 'hires' ? 'accent-black shrink-0' : 'accent-gray-400 shrink-0'}
                    />
                    <div className={`flex-1 ${current.endMode === 'hires' ? '' : 'opacity-60'}`}>
                      <Field label="Hires" active={current.endMode === 'hires'}>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={current.endHires || 10}
                          onChange={e => {
                            const val = Math.max(0, Math.floor(Number(e.target.value || 0)));
                            setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, endHires: val } : c));
                          }}
                          disabled={current.endMode !== 'hires'}
                          className={inputBase}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* End Date */}
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="End date radio"
                      type="radio"
                      name="endMode"
                      checked={current.endMode === 'date'}
                      onChange={() => setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, endMode: 'date' } : c))}
                      className={current.endMode === 'date' ? 'accent-black shrink-0' : 'accent-gray-400 shrink-0'}
                    />
                    <div className={`flex-1 ${current.endMode === 'date' ? '' : 'opacity-60'}`}>
                      <Field label="End Date" active={current.endMode === 'date'}>
                        <input
                          type="date"
                          value={current.endDate || ''}
                          onChange={e => {
                            const newDate = e.target.value;
                            setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, endDate: newDate } : c));
                          }}
                          disabled={current.endMode !== 'date'}
                          className={inputBase}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Target Staffing */}
                  <div className="col-span-2">
                    <div className="flex items-start gap-2">
                      <input
                        aria-label="Target Staffing radio"
                        type="radio"
                        name="endMode"
                        checked={current.endMode === 'staffing'}
                        onChange={() => setCampaigns(prev => prev.map(c => c.id === current.id ? {
                          ...c,
                          endMode: 'staffing',
                          targetStaffing: c.targetStaffing || { good: 70, ok: 25, bad: 5 }
                        } : c))}
                        className={`mt-3 ${current.endMode === 'staffing' ? 'accent-black shrink-0' : 'accent-gray-400 shrink-0'}`}
                      />
                      <div className={`flex-1 ${current.endMode === 'staffing' ? '' : 'opacity-60'}`}>
                        <Field label="Target Staffing (%)" active={current.endMode === 'staffing'}>
                          <div className="space-y-2">
                            {/* Before / Target Pills */}
                            <div className="flex gap-4 mb-2">
                              {/* Before (static example - 40/35/25) */}
                              <div>
                                <div className="text-[10px] text-gray-500 mb-1">Before</div>
                                <div className="flex h-6 rounded overflow-hidden shadow-sm">
                                  <div className="flex items-center justify-center px-2 text-white text-xs font-medium" style={{ width: '40%', backgroundColor: '#8ace00' }}>40</div>
                                  <div className="flex items-center justify-center px-2 text-white text-xs font-medium" style={{ width: '35%', backgroundColor: '#6c6c6c' }}>35</div>
                                  <div className="flex items-center justify-center px-2 text-white text-xs font-medium" style={{ width: '25%', backgroundColor: '#d20011' }}>25</div>
                                </div>
                              </div>

                              {/* Arrow */}
                              <div className="flex items-center text-gray-400">→</div>

                              {/* Target (dynamic) */}
                              <div>
                                <div className="text-[10px] text-gray-500 mb-1">Target</div>
                                <div className="flex h-6 rounded overflow-hidden shadow-sm">
                                  <div
                                    className="flex items-center justify-center px-2 text-white text-xs font-medium"
                                    style={{
                                      width: `${current.targetStaffing?.good || 70}%`,
                                      backgroundColor: '#8ace00'
                                    }}
                                  >
                                    {current.targetStaffing?.good || 70}
                                  </div>
                                  <div
                                    className="flex items-center justify-center px-2 text-white text-xs font-medium"
                                    style={{
                                      width: `${current.targetStaffing?.ok || 25}%`,
                                      backgroundColor: '#6c6c6c'
                                    }}
                                  >
                                    {current.targetStaffing?.ok || 25}
                                  </div>
                                  <div
                                    className="flex items-center justify-center px-2 text-white text-xs font-medium"
                                    style={{
                                      width: `${current.targetStaffing?.bad || 5}%`,
                                      backgroundColor: '#d20011'
                                    }}
                                  >
                                    {current.targetStaffing?.bad || 5}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Input fields */}
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-600">Good %</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={current.targetStaffing?.good || 70}
                                  onChange={e => {
                                    const val = Math.max(0, Math.min(100, Number(e.target.value || 0)));
                                    setCampaigns(prev => prev.map(c => c.id === current.id ? {
                                      ...c,
                                      targetStaffing: {
                                        ...c.targetStaffing,
                                        good: val,
                                        ok: c.targetStaffing?.ok || 25,
                                        bad: c.targetStaffing?.bad || 5
                                      }
                                    } : c));
                                  }}
                                  disabled={current.endMode !== 'staffing'}
                                  className="w-full px-2 py-1 text-xs border rounded"
                                  style={{ borderColor: '#8ace00' }}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-600">OK %</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={current.targetStaffing?.ok || 25}
                                  onChange={e => {
                                    const val = Math.max(0, Math.min(100, Number(e.target.value || 0)));
                                    setCampaigns(prev => prev.map(c => c.id === current.id ? {
                                      ...c,
                                      targetStaffing: {
                                        good: c.targetStaffing?.good || 70,
                                        ok: val,
                                        bad: c.targetStaffing?.bad || 5
                                      }
                                    } : c));
                                  }}
                                  disabled={current.endMode !== 'staffing'}
                                  className="w-full px-2 py-1 text-xs border rounded"
                                  style={{ borderColor: '#6c6c6c' }}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-600">Bad %</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={current.targetStaffing?.bad || 5}
                                  onChange={e => {
                                    const val = Math.max(0, Math.min(100, Number(e.target.value || 0)));
                                    setCampaigns(prev => prev.map(c => c.id === current.id ? {
                                      ...c,
                                      targetStaffing: {
                                        good: c.targetStaffing?.good || 70,
                                        ok: c.targetStaffing?.ok || 25,
                                        bad: val
                                      }
                                    } : c));
                                  }}
                                  disabled={current.endMode !== 'staffing'}
                                  className="w-full px-2 py-1 text-xs border rounded"
                                  style={{ borderColor: '#d20011' }}
                                />
                              </div>
                            </div>
                          </div>
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Status Control Buttons */}
              <div className="flex gap-2">
                {current.status !== 'active' && current.status !== 'archived' && (
                  <button
                    onClick={() => setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, status: 'active' } : c))}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition bg-green-600 hover:bg-green-700 text-white"
                  >
                    Launch Campaign
                  </button>
                )}
                {current.status === 'active' && (
                  <button
                    onClick={() => setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, status: 'suspended' } : c))}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Suspend Campaign
                  </button>
                )}
                {current.status !== 'archived' && (
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to end and archive "${current.name}"? This cannot be undone.`)) {
                        setCampaigns(prev => prev.map(c => c.id === current.id ? { ...c, status: 'archived' } : c));
                      }
                    }}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    End and Archive
                  </button>
                )}
                {current.status === 'archived' && (
                  <button
                    onClick={() => {
                      // Create a copy of the archived campaign
                      const newCampaign: Campaign = {
                        ...current,
                        id: `c${Date.now()}`,
                        name: `${current.name} (Copy)`,
                        createdAt: new Date().toISOString().slice(0, 10),
                        status: 'draft',
                        startDate: new Date().toISOString().slice(0, 10),
                      };
                      setCampaigns(prev => [newCampaign, ...prev]);
                      setActiveId(newCampaign.id);
                    }}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Restart as New Campaign
                  </button>
                )}
                <div className="flex-1"></div>
                <span className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  current.status === 'active' ? 'bg-green-100 text-green-700' :
                  current.status === 'suspended' ? 'bg-gray-100 text-gray-600' :
                  current.status === 'archived' ? 'bg-gray-200 text-gray-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {current.status.toUpperCase()}
                </span>
              </div>
            </div>
          )}

          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm font-semibold mb-2">Sources & Daily Budgets</div>
            <div className="grid grid-cols-12 text-xs font-semibold text-gray-600 border-b pb-1">
              <div className="col-span-4">Source</div>
              <div className="col-span-2">Enabled</div>
              <div className="col-span-3">Daily Cap (0 = infinite)</div>
              <div className="col-span-3">Daily Budget ($)</div>
            </div>
            {(current?.sources||[]).map((s)=> (
              <div key={s.key} className="grid grid-cols-12 items-center text-sm py-1 border-b last:border-b-0">
                <div className="col-span-4 capitalize">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{background:SRC_COLOR[s.key]}}></span>
                  {s.key.replace('_',' ')} <span className="text-gray-500">(CPA ${s.cpa.toFixed(2)})</span>
                </div>
                <div className="col-span-2">
                  <input type="checkbox" checked={s.enabled} onChange={e=>{
                    const on = e.target.checked;
                    setCampaigns(prev=> prev.map(c=> c.id!==(current?.id||'')? c: ({...c, sources: c.sources.map(v=> v.key===s.key? {...v,enabled:on}:v)})));
                  }} />
                </div>
                <div className="col-span-3">
                  <input type="number" min={0} className="w-28 px-2 py-0.5 bg-transparent outline-none" value={s.dailyCap}
                    onChange={e=>{
                      const val = Math.max(0, Number(e.target.value||0));
                      setCampaigns(prev=> prev.map(c=> c.id!==(current?.id||'')? c: ({...c, sources: c.sources.map(v=> v.key===s.key? {...v,dailyCap:val}:v)})));
                    }} />
                </div>
                <div className="col-span-3">
                  <input type="number" step="0.01" className="w-28 px-2 py-0.5 bg-transparent outline-none" value={s.dailyBudget.toFixed(2)}
                    onChange={e=>{
                      const val = round2(Number(e.target.value||0));
                      setCampaigns(prev=> prev.map(c=> c.id!==(current?.id||'')? c: ({...c, sources: c.sources.map(v=> v.key===s.key? {...v,dailyBudget:Math.max(0,val)}:v)})));
                    }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Daily Applicants by Source</div>
              <div className="text-right">
                <div className="text-2xl font-bold leading-5">{totalApplicantsInt.toLocaleString()}</div>
                <div className="text-[11px] text-gray-500 leading-4">applicants</div>
              </div>
            </div>
            <AreaSection series={dailySeries} sources={current?.sources||[]} showPoints={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===============================
// CampaignsWindow – flattened fields, robust date defaults
// ===============================

// Field component defined outside to prevent re-renders and focus issues
const Field = ({label, children, active = false}: {label: string; children: React.ReactNode; active?: boolean})=> (
  <div className={`relative border rounded-md px-2 pt-2 pb-1 bg-white min-h-[38px] ${active ? 'border-gray-600' : 'border-gray-400'}`}>
    <div className="absolute left-2 -top-2 bg-white px-1 text-[11px] text-gray-500">{label}</div>
    {children}
  </div>
);

const inputBase = "w-full bg-transparent outline-none text-sm py-1";

interface CampaignsWindowProps {
  campaigns: Campaign[];
  activeId: string;
  setActiveId: (id: string) => void;
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  onSelectCampaign: (campaign: Campaign) => void;
  advertisements: Advertisement[];
  selectedJobs: string[];
  selectedLocations: string[];
  showNewCampaignModal: boolean;
  setShowNewCampaignModal: (show: boolean) => void;
}

function CampaignsWindow(props: CampaignsWindowProps){
  const {
    campaigns = [],
    activeId,
    setActiveId,
    setCampaigns,
    onSelectCampaign,
    advertisements = [],
    selectedJobs = [],
    selectedLocations = [],
    showNewCampaignModal,
    setShowNewCampaignModal,
  } = props || {};

  const previewRows = useMemo(()=>{
    return (campaigns || []).map((c)=>{
      let right = '';
      if(c.endMode==='date' && c.endDate)   right = `${formatDate(c.startDate)} - ${formatDate(c.endDate)}`;
      if(c.endMode==='hires' && c.endHires)  right = `Target: ${c.endHires} hires`;
      if(c.endMode==='budget' && c.endBudget) right = `Budget: $ ${c.endBudget.toLocaleString()}`;
      return { id:c.id || '', name:c.name || 'Untitled Campaign', right, status: c.status };
    });
  },[campaigns]);

  return (
    <div className="bg-white border rounded-xl p-3">
      {/* New Campaign Button */}
      <button
        onClick={() => setShowNewCampaignModal(true)}
        className="w-full mb-3 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
      >
        + New Campaign
      </button>

      {/* Scrollable Campaign List */}
      <div className="border rounded-lg h-[calc(100vh-200px)] overflow-y-scroll pr-2">
        <div className="divide-y">
          {previewRows.map(row=> {
            const campaign = campaigns.find(c => c.id === row.id);
            return (
              <button
                key={row.id}
                onClick={()=> {
                  if (campaign) {
                    onSelectCampaign(campaign);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition ${
                  row.id===activeId
                    ? row.status === 'active'
                      ? 'bg-green-50 border-l-4 border-green-600'
                      : row.status === 'suspended'
                        ? 'bg-gray-50 border-l-4 border-gray-400'
                        : row.status === 'archived'
                          ? 'bg-gray-100 border-l-4 border-gray-500'
                          : 'bg-blue-50 border-l-4 border-blue-600'
                    : row.status === 'active'
                      ? 'hover:bg-green-50'
                      : row.status === 'suspended'
                        ? 'hover:bg-gray-50 opacity-60'
                        : row.status === 'archived'
                          ? 'hover:bg-gray-100 opacity-50'
                          : 'hover:bg-blue-50'
                }`}
              >
                <div className="flex-1 truncate">
                  <div className="flex items-center gap-2">
                    <span className={`truncate ${row.status === 'archived' ? 'line-through text-gray-500' : ''}`}>{row.name}</span>
                    {row.status === 'active' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-600 text-white">
                        ACTIVE
                      </span>
                    )}
                    {row.status === 'suspended' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-400 text-white">
                        SUSPENDED
                      </span>
                    )}
                    {row.status === 'archived' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-500 text-white">
                        ARCHIVED
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-gray-700 ml-3 shrink-0 text-xs">{row.right}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* New Campaign Modal */}
      {showNewCampaignModal && (
        <NewCampaignModal
          advertisements={advertisements}
          selectedJobs={selectedJobs}
          selectedLocations={selectedLocations}
          campaigns={campaigns}
          onClose={() => setShowNewCampaignModal(false)}
          onCreateCampaign={(newCampaign) => {
            setCampaigns(prev => [newCampaign, ...prev]);
            setActiveId(newCampaign.id);
            setShowNewCampaignModal(false);
          }}
        />
      )}
    </div>
  );
}

// ===============================
// NewCampaignModal – Modal for creating campaigns from job postings
// ===============================
interface NewCampaignModalProps {
  advertisements: Advertisement[];
  selectedJobs: string[];
  selectedLocations: string[];
  campaigns: Campaign[];
  onClose: () => void;
  onCreateCampaign: (campaign: Campaign) => void;
}

function NewCampaignModal({ advertisements, selectedJobs, selectedLocations, campaigns, onClose, onCreateCampaign }: NewCampaignModalProps) {
  const [selectedJobRole, setSelectedJobRole] = useState<string>('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(isoDate(new Date()));
  const [endMode, setEndMode] = useState<'budget' | 'hires' | 'date' | 'staffing'>('date');
  const [endBudget, setEndBudget] = useState(1000);
  const [endHires, setEndHires] = useState(10);
  const tmpEnd = new Date(); tmpEnd.setDate(tmpEnd.getDate()+30);
  const [endDate, setEndDate] = useState(isoDate(tmpEnd));

  // Try to find a finalized ad for the selected job, but also support jobs without ads
  const selectedAd = advertisements.find(ad => ad.role === selectedJobRole);

  const handleCopyFromCampaign = (campaignId: string) => {
    if (!campaignId) return;

    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    // Populate all fields from the selected campaign
    setName(`${campaign.name} (Copy)`);
    setStartDate(campaign.startDate);
    setEndMode(campaign.endMode);
    setEndBudget(campaign.endBudget || 1000);
    setEndHires(campaign.endHires || 10);
    setEndDate(campaign.endDate || isoDate(tmpEnd));

    // If the campaign has jobs, select the first job role
    if (campaign.jobs && campaign.jobs.length > 0) {
      setSelectedJobRole(campaign.jobs[0]);
    }
  };

  const handleCreate = () => {
    if (!selectedJobRole || !name.trim()) {
      alert('Please select a job posting and enter a campaign name');
      return;
    }

    const newCampaign: Campaign = {
      id: `c${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      sources: DEFAULT_SOURCES,
      status: 'draft',
      locations: selectedAd?.locations || selectedLocations,
      jobs: [selectedJobRole],
      startDate: startDate,
      endDate: endMode === 'date' ? endDate : undefined,
      endBudget: endMode === 'budget' ? endBudget : undefined,
      endHires: endMode === 'hires' ? endHires : undefined,
      endMode: endMode,
      timeRanges: selectedAd?.timeRanges || [],
    };

    onCreateCampaign(newCampaign);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Create New Campaign</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Copy from Previous Campaign */}
          {campaigns.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Copy from Previous Campaign (Optional)
              </label>
              <select
                onChange={(e) => handleCopyFromCampaign(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue=""
              >
                <option value="">-- Select a campaign to copy --</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Job Posting Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Job Posting
            </label>
            {selectedJobs.length === 0 ? (
              <div className="p-4 border rounded-lg text-center text-gray-500">
                No job postings set up yet. Go to Job Posting tab to create one.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {selectedJobs.map(jobRole => {
                  const ad = advertisements.find(a => a.role === jobRole);
                  return (
                    <button
                      key={jobRole}
                      onClick={() => {
                        setSelectedJobRole(jobRole);
                        setName(`${jobRole} Campaign`);
                      }}
                      className={`w-full text-left p-3 border rounded-lg transition ${
                        selectedJobRole === jobRole
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-semibold">{jobRole}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {ad ? (
                          <>
                            {ad.locations.join(', ')} • Finalized {new Date(ad.finalizedAt).toLocaleDateString()}
                            {ad.timeRanges && ad.timeRanges.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {ad.timeRanges.map((range, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                                    {range.start}-{range.end}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-500">
                            {selectedLocations.length > 0 ? selectedLocations.join(', ') : 'No locations selected'} • In progress
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Campaign Name */}
          <div className="mb-4">
            <Field label="Campaign Name" active={true}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter campaign name"
                className={inputBase}
              />
            </Field>
          </div>

          {/* Start Date */}
          <div className="mb-4">
            <Field label="Start Date" active={true}>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={inputBase}
              />
            </Field>
          </div>

          {/* End Criteria */}
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Campaign End Criteria</div>
            <div className="flex items-center gap-2 mb-2">
              {/* Budget */}
              <input
                aria-label="Budget radio"
                type="radio"
                name="end"
                checked={endMode==='budget'}
                onChange={()=>setEndMode('budget')}
                className={endMode==='budget' ? 'accent-black shrink-0' : 'accent-gray-400 shrink-0'}
              />
              <div className={`flex-1 ${endMode==='budget' ? '' : 'opacity-60'}`}>
                <Field label="Budget" active={endMode==='budget'}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={endBudget}
                    onChange={e=>setEndBudget(Math.max(0, Math.floor(Number(e.target.value||0))))}
                    className={inputBase}
                  />
                </Field>
              </div>

              {/* Hires */}
              <input
                aria-label="Hires radio"
                type="radio"
                name="end"
                checked={endMode==='hires'}
                onChange={()=>setEndMode('hires')}
                className={endMode==='hires' ? 'accent-black shrink-0' : 'accent-gray-400 shrink-0'}
              />
              <div className={`flex-1 ${endMode==='hires' ? '' : 'opacity-60'}`}>
                <Field label="Hires" active={endMode==='hires'}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={endHires}
                    onChange={e=>setEndHires(Math.max(0, Math.floor(Number(e.target.value||0))))}
                    className={inputBase}
                  />
                </Field>
              </div>

              {/* End Date */}
              <input
                aria-label="End date radio"
                type="radio"
                name="end"
                checked={endMode==='date'}
                onChange={()=>setEndMode('date')}
                className={endMode==='date' ? 'accent-black shrink-0' : 'accent-gray-400 shrink-0'}
              />
              <div className={`flex-1 ${endMode==='date' ? '' : 'opacity-60'}`}>
                <Field label="End Date" active={endMode==='date'}>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e=>setEndDate(e.target.value)}
                    className={inputBase}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedJobRole || !name.trim()}
            >
              Create Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===============================
// AreaSection – stacked smooth areas with points
// ===============================
interface AreaSectionProps {
  series: any[];
  sources: Source[];
  showPoints?: boolean;
}

function AreaSection({ series, sources, showPoints }: AreaSectionProps){
  const enabled = (sources || []).filter(s=> s.enabled && s.cpa>0 && s.dailyBudget>0);
  if (enabled.length===0) return <div className="text-sm text-gray-500">Enable at least one paid source to visualize.</div>;

  const days = series.length;
  const W = 840, H = 270, PADL = 52, PADB = 50, PADT = 22, PADR = 12;
  const innerW = W-PADL-PADR, innerH = H-PADT-PADB;

  const stack = series.map(d=>{
    let acc=0; const layers: any[]=[];
    enabled.forEach(s=>{ const v=Number(d.bySource[s.key]||0); const y0=acc; acc+=Math.max(0,v); layers.push({key:s.key,y0,y1:acc}); });
    return { total: acc, layers, label: d.weekday, date: d.date };
  });
  const maxY = Math.max(1, ...stack.map(r=> r.total));
  const X = (i: number)=> PADL + (i/(Math.max(1,days-1)))*innerW;
  const Y = (v: number)=> PADT + innerH - (v/maxY)*innerH;

  const smooth = (pts: {x: number; y: number}[])=>{
    if(pts.length<2) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for(let i=0;i<pts.length-1;i++){
      const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
      const c1x=p1.x+(p2.x-p0.x)/6, c1y=p1.y+(p2.y-p0.y)/6;
      const c2x=p2.x-(p3.x-p1.x)/6, c2y=p2.y-(p3.y-p1.y)/6;
      d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const buildAreaPath = (upper: {x: number; y: number}[], lower: {x: number; y: number}[])=>{
    if(!upper.length || !lower.length) return '';
    let d = smooth(upper);
    d += ` L ${lower[0].x},${lower[0].y}`;
    if(lower.length>1){
      for(let i=0;i<lower.length-1;i++){
        const p0=lower[i-1]||lower[i], p1=lower[i], p2=lower[i+1], p3=lower[i+2]||p2;
        const c1x=p1.x+(p2.x-p0.x)/6, c1y=p1.y+(p2.y-p0.y)/6;
        const c2x=p2.x-(p3.x-p1.x)/6, c2y=p2.y-(p3.y-p1.y)/6;
        d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
      }
    }
    d += ' Z';
    return d;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[270px]">
      {[0,0.25,0.5,0.75,1].map((t,i)=>{
        const y = PADT + innerH - t*innerH;
        return <line key={i} x1={PADL} y1={y} x2={W-PADR} y2={y} stroke="#e5e7eb" strokeDasharray="3 3"/>;
      })}
      <line x1={PADL} y1={PADT} x2={PADL} y2={H-PADB} stroke="#cbd5e1"/>
      <line x1={PADL} y1={H-PADB} x2={W-PADR} y2={H-PADB} stroke="#cbd5e1"/>

      {enabled.map((s,si)=>{
        const upper = stack.map((r,i)=>({x:X(i), y:Y(r.layers[si].y1)}));
        const lower = stack.map((r,i)=>({x:X(i), y:Y(r.layers[si].y0)})).reverse();
        const d = buildAreaPath(upper, lower);
        return <path key={s.key} d={d} fill={SRC_COLOR[s.key]} opacity={0.65} stroke="#000" strokeWidth={0.5}/>;
      })}

      {showPoints !== false && enabled.map((s,si)=> stack.map((r,i)=>{
        const uy = Y(r.layers[si].y1), ly = Y(r.layers[si].y0), x=X(i);
        return (
          <g key={`${s.key}-${i}`}>
            <circle cx={x} cy={uy} r={1.5} fill="#111" />
            <circle cx={x} cy={ly} r={1.5} fill="#666" />
          </g>
        );
      }))}

      {stack.map((r,i)=>{
        const x=X(i);
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={H-PADB} y2={H-PADB+4} stroke="#94a3b8"/>
            <text x={x} y={H-PADB+16} fontSize="10" textAnchor="middle" fill="#475569">{r.label}</text>
            <text x={x} y={H-PADB+28} fontSize="10" textAnchor="middle" fill="#94a3b8">{r.date}</text>
          </g>
        );
      })}

      {[0,0.25,0.5,0.75,1].map((t,i)=>{
        const v=Math.round(t* Math.max(1,...stack.map(r=>r.total))); const y=PADT+innerH-t*innerH;
        return <text key={i} x={PADL-6} y={y+3} fontSize="10" textAnchor="end" fill="#475569">{v}</text>;
      })}

      {enabled.map((s,idx)=>(
        <g key={s.key} transform={`translate(${PADL + idx*150}, ${H-18})`}>
          <rect width="10" height="10" rx="2" fill={SRC_COLOR[s.key]}/>
          <text x="14" y="9" fontSize="10" fill="#334155" style={{textTransform:'capitalize'}}>{s.key.replace('_',' ')}</text>
        </g>
      ))}
    </svg>
  );
}

