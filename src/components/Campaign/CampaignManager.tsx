import React, { useEffect, useMemo, useState } from "react";

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
  status: 'active' | 'suspended' | 'draft';
  locations: string[];
  jobs: string[];
  startDate: string;
  endDate?: string;
  endBudget?: number;
  endHires?: number;
  endMode: 'date' | 'budget' | 'hires';
}

// ---- demo data
const DEFAULT_SOURCES: Source[] = [
  { key: 'indeed',     enabled: true,  dailyCap: 40, dailyBudget: 300, cpa: 18.43 },
  { key: 'facebook',   enabled: true,  dailyCap: 35, dailyBudget: 250, cpa: 23.12 },
  { key: 'craigslist', enabled: true,  dailyCap: 14, dailyBudget:  65, cpa: 12.40 },
  { key: 'referrals',  enabled: true,  dailyCap: 12, dailyBudget:  55, cpa:  6.25 },
  { key: 'qr_posters', enabled: false, dailyCap:  0, dailyBudget:   0, cpa:  0.00 },
];

const CAMPAIGNS: Campaign[] = [
  { id:'c7', name:'Summer Hiring Blitz', createdAt:'2025-11-01', sources: DEFAULT_SOURCES, status: 'active', locations: ['BOS', 'LGA'], jobs: ['Server', 'Host'], startDate: '2025-11-01', endDate: '2025-12-15', endMode: 'date' },
  { id:'c6', name:'Q4 Expansion', createdAt:'2025-10-25', sources: DEFAULT_SOURCES, status: 'suspended', locations: ['DCA'], jobs: ['Cook', 'Server'], startDate: '2025-10-25', endBudget: 5000, endMode: 'budget' },
  { id:'c5', name:'Weekend Warriors', createdAt:'2025-10-18', sources: DEFAULT_SOURCES, status: 'active', locations: ['BOS'], jobs: ['Bartender', 'Server'], startDate: '2025-10-18', endHires: 15, endMode: 'hires' },
  { id:'c4', name:'New Menu Launch', createdAt:'2025-10-15', sources: DEFAULT_SOURCES, status: 'active', locations: ['LGA', 'DCA'], jobs: ['Cook'], startDate: '2025-10-15', endDate: '2025-11-30', endMode: 'date' },
  { id:'c3', name:'New Location Opening', createdAt:'2025-10-14', sources: DEFAULT_SOURCES, status: 'active', locations: ['ORD'], jobs: ['Cook', 'Server', 'Host'], startDate: '2025-10-14', endDate: '2025-12-01', endMode: 'date' },
  { id:'c2', name:'Weekend Staffing', createdAt:'2025-09-28', sources: DEFAULT_SOURCES, status: 'suspended', locations: ['BOS', 'LGA'], jobs: ['Server'], startDate: '2025-09-28', endBudget: 3000, endMode: 'budget' },
  { id:'c1', name:'Holiday Surge', createdAt:'2025-08-31', sources: DEFAULT_SOURCES, status: 'active', locations: ['BOS'], jobs: ['Cook', 'Server', 'Bartender'], startDate: '2025-08-31', endDate: '2025-12-25', endMode: 'date' },
];

const applicantsPerDay = (s: Source) => {
  if (!s.enabled || s.cpa <= 0 || s.dailyBudget <= 0) return 0;
  const est = s.dailyBudget / s.cpa;
  return s.dailyCap > 0 ? Math.min(est, s.dailyCap) : est;
};

interface CampaignManagerProps {
  selectedLocations: string[];
  setSelectedLocations: (locations: string[]) => void;
  selectedJobs: string[];
  setSelectedJobs: (jobs: string[]) => void;
}

export default function CampaignManager({ selectedLocations, setSelectedLocations, selectedJobs, setSelectedJobs }: CampaignManagerProps){
  const [campaigns, setCampaigns] = useState(
    [...CAMPAIGNS].sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
  const [activeId, setActiveId] = useState(campaigns[0]?.id);
  const current = useMemo(()=> campaigns.find(c=>c.id===activeId) || campaigns[0], [campaigns, activeId]);

  const handleSelectCampaign = (campaign: Campaign) => {
    setActiveId(campaign.id);
    // Update global selections
    setSelectedLocations(campaign.locations);
    setSelectedJobs(campaign.jobs);
  };

  // Default date range: today → +27 days
  const today = new Date();
  const fourWeeksOut = new Date(today); fourWeeksOut.setDate(today.getDate()+27);
  const [dateRange, setDateRange] = useState(()=>({ start: isoDate(today), end: isoDate(fourWeeksOut) }));

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
            dateRange={dateRange}
            setDateRange={setDateRange}
            onSelectCampaign={handleSelectCampaign}
            selectedLocations={selectedLocations}
            selectedJobs={selectedJobs}
          />
        </div>

        {/* RIGHT: Sources + Chart */}
        <div className="col-span-12 md:col-span-7 lg:col-span-8 space-y-4">
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
interface CampaignsWindowProps {
  campaigns: Campaign[];
  activeId: string;
  setActiveId: (id: string) => void;
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  onSelectCampaign: (campaign: Campaign) => void;
  selectedLocations: string[];
  selectedJobs: string[];
}

function CampaignsWindow(props: CampaignsWindowProps){
  const {
    campaigns = [],
    activeId,
    setActiveId = ()=>{},
    setCampaigns = ()=>{},
    dateRange: incomingDateRange,
    setDateRange = ()=>{},
    onSelectCampaign,
    selectedLocations,
    selectedJobs,
  } = props || {};

  const today = new Date();
  const defaultStart = isoDate(today);
  const tmpEnd = new Date(today); tmpEnd.setDate(today.getDate()+30);
  const defaultEnd = isoDate(tmpEnd);
  const dateRange = (incomingDateRange && typeof incomingDateRange === 'object')
    ? { start: incomingDateRange.start || defaultStart, end: incomingDateRange.end || defaultEnd }
    : { start: defaultStart, end: defaultEnd };

  const [name, setName] = useState('');
  const [start, setStart] = useState(dateRange.start);
  const [endMode, setEndMode] = useState<'budget' | 'hires' | 'date'>('date');
  const [endBudget, setEndBudget] = useState(1000);
  const [endHires, setEndHires] = useState(10);
  const [endDate, setEndDate] = useState(dateRange.end);
  const [campaignStatus, setCampaignStatus] = useState<'active' | 'suspended' | 'draft'>('draft');

  // Populate form when a campaign is selected (only when activeId changes)
  useEffect(() => {
    const selectedCampaign = campaigns.find(c => c.id === activeId);
    if (selectedCampaign) {
      setName(selectedCampaign.name);
      setStart(selectedCampaign.startDate);
      setEndMode(selectedCampaign.endMode);
      setEndBudget(selectedCampaign.endBudget || 1000);
      setEndHires(selectedCampaign.endHires || 10);
      setEndDate(selectedCampaign.endDate || dateRange.end);
      setCampaignStatus(selectedCampaign.status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]); // Only re-run when campaign selection changes, not on every campaigns array update

  const Field = ({label, children, active = false}: {label: string; children: React.ReactNode; active?: boolean})=> (
    <div className={`relative border rounded-md px-2 pt-2 pb-1 bg-white min-h-[38px] ${active ? 'border-gray-600' : 'border-gray-400'}`}>
      <div className="absolute left-2 -top-2 bg-white px-1 text-[11px] text-gray-500">{label}</div>
      {children}
    </div>
  );
  const inputBase = "w-full bg-transparent outline-none text-sm py-1";

  const saveStart = (v: string)=>{ setStart(v); setDateRange((r)=>({...(r||{}), start:v})); };
  const saveEnd   = (v: string)=>{ setEndDate(v); setEndMode('date'); setDateRange((r)=>({...(r||{}), end:v})); };

  const handleLaunchSuspend = () => {
    const newStatus: 'active' | 'suspended' = campaignStatus === 'active' ? 'suspended' : 'active';
    setCampaignStatus(newStatus);
    
    // Check if this campaign already exists in the list
    const existingCampaign = campaigns.find(c => c.id === activeId);
    
    if (existingCampaign) {
      // Update existing campaign status (includes copied campaigns)
      setCampaigns(prev => prev.map(c => 
        c.id === activeId ? { ...c, status: newStatus } : c
      ));
    } else if (campaignStatus === 'draft' && name.trim()) {
      // Create a brand new campaign (only if it doesn't exist yet)
      const newCampaign: Campaign = {
        id: `c${Date.now()}`,
        name: name.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
        sources: DEFAULT_SOURCES,
        status: newStatus,
        locations: selectedLocations,
        jobs: selectedJobs,
        startDate: start,
        endDate: endMode === 'date' ? endDate : undefined,
        endBudget: endMode === 'budget' ? endBudget : undefined,
        endHires: endMode === 'hires' ? endHires : undefined,
        endMode: endMode,
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      setActiveId(newCampaign.id);
    }
  };

  const handleSave = () => {
    // Save current campaign changes
    setCampaigns(prev => prev.map(c => 
      c.id === activeId ? {
        ...c,
        name,
        startDate: start,
        endDate: endMode === 'date' ? endDate : undefined,
        endBudget: endMode === 'budget' ? endBudget : undefined,
        endHires: endMode === 'hires' ? endHires : undefined,
        endMode: endMode,
      } : c
    ));
  };

  const handleCopy = () => {
    const currentCampaign = campaigns.find(c => c.id === activeId);
    if (currentCampaign) {
      // Create a new campaign with copied data
      const copiedCampaign: Campaign = {
        ...currentCampaign,
        id: `c${Date.now()}`,
        name: `${currentCampaign.name} (Copy)`,
        status: 'draft',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      
      // Add to campaigns list and select it
      setCampaigns(prev => [copiedCampaign, ...prev]);
      setActiveId(copiedCampaign.id);
      
      // Form fields will auto-populate via useEffect when activeId changes
    }
  };

  const handleDelete = () => {
    const currentCampaign = campaigns.find(c => c.id === activeId);
    if (currentCampaign && window.confirm(`Are you sure you want to delete "${currentCampaign.name}"? This action cannot be undone.`)) {
      setCampaigns(prev => prev.filter(c => c.id !== activeId));
      // Select the first remaining campaign or clear if none left
      const remaining = campaigns.filter(c => c.id !== activeId);
      if (remaining.length > 0) {
        setActiveId(remaining[0].id);
      }
    }
  };

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
      {/* Row 1 */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <Field label="Campaign" active={true}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className={inputBase}/>
          </Field>
        </div>
        <div className="w-[33%]">
          <Field label="Start Date" active={true}>
            <input type="date" value={start} onChange={e=>saveStart(e.target.value)} className={inputBase} />
          </Field>
        </div>
      </div>

      {/* Campaign End Criteria */}
      <div className="text-xs text-gray-600 mb-2">Campaign End Criteria</div>
      <div className="flex items-center gap-[5px] mb-3">
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
            <input type="date" value={endDate} onChange={e=>saveEnd(e.target.value)} className={inputBase} />
          </Field>
        </div>
      </div>

      {/* Campaign Action Buttons */}
      <div className="mb-3 space-y-2">
        {/* Primary Actions */}
        <div className="flex gap-2">
          {campaignStatus !== 'active' && (
            <button
              onClick={handleLaunchSuspend}
              className="flex-1 px-3 py-2 rounded-lg font-medium text-sm transition bg-green-600 hover:bg-green-700 text-white"
            >
              Launch
            </button>
          )}
          {campaignStatus === 'active' && (
            <button
              onClick={handleLaunchSuspend}
              className="flex-1 px-3 py-2 rounded-lg font-medium text-sm transition bg-orange-600 hover:bg-orange-700 text-white"
            >
              Suspend
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 rounded-lg font-medium text-sm transition bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save
          </button>
        </div>
        
        {/* Secondary Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 px-3 py-2 rounded-lg font-medium text-sm transition bg-gray-600 hover:bg-gray-700 text-white"
          >
            Copy
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 px-3 py-2 rounded-lg font-medium text-sm transition bg-red-600 hover:bg-red-700 text-white"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Scrollable Campaign List */}
      <div className="border rounded-lg h-64 overflow-y-scroll pr-2">
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
                        : 'bg-blue-50 border-l-4 border-blue-600'
                    : row.status === 'active'
                      ? 'hover:bg-green-50'
                      : row.status === 'suspended'
                        ? 'hover:bg-gray-50 opacity-60'
                        : 'hover:bg-blue-50'
                }`}
              >
                <div className="flex-1 truncate">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{row.name}</span>
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
                  </div>
                </div>
                <span className="text-gray-700 ml-3 shrink-0 text-xs">{row.right}</span>
              </button>
            );
          })}
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

