import { useState, useEffect } from 'react';
import PlanningScreen from './components/DemandForecast/PlanningScreen';
import CampaignManager from './components/Campaign/CampaignManager';
import AdvertisementManager from './components/Advertisement/AdvertisementManager';
import CompanyProfile from './components/CompanyProfile/CompanyProfile';

type Tab = 'demand' | 'advertisement' | 'campaign' | 'review' | 'profile';

interface TimeRange {
  start: string; // e.g., "08:00"
  end: string;   // e.g., "17:00"
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
  status: 'active' | 'suspended' | 'draft' | 'archived';
  locations: string[];
  jobs: string[];
  startDate: string;
  endDate?: string;
  endBudget?: number;
  endHires?: number;
  endMode: 'date' | 'budget' | 'hires';
  timeRanges?: TimeRange[];
  sources?: Source[];
}

// Initial campaign data
const INITIAL_CAMPAIGNS: Campaign[] = [
  { id:'c7', name:'Summer Hiring Blitz', createdAt:'2025-11-01', status: 'active', locations: ['BOS', 'LGA'], jobs: ['Server', 'Host'], startDate: '2025-11-01', endDate: '2025-12-15', endMode: 'date', timeRanges: [{ start: '11:00', end: '14:00', days: [4, 5, 6] }, { start: '17:00', end: '22:00', days: [4, 5, 6] }] },
  { id:'c6', name:'Q4 Expansion', createdAt:'2025-10-25', status: 'suspended', locations: ['DCA'], jobs: ['Cook', 'Server'], startDate: '2025-10-25', endBudget: 5000, endMode: 'budget', timeRanges: [{ start: '10:00', end: '16:00', days: [0, 1, 2, 3, 4] }] },
  { id:'c5', name:'Weekend Warriors', createdAt:'2025-10-18', status: 'active', locations: ['BOS'], jobs: ['Bartender', 'Server'], startDate: '2025-10-18', endHires: 15, endMode: 'hires', timeRanges: [{ start: '18:00', end: '23:00', days: [5, 6] }] },
  { id:'c4', name:'New Menu Launch', createdAt:'2025-10-15', status: 'active', locations: ['LGA', 'DCA'], jobs: ['Cook'], startDate: '2025-10-15', endDate: '2025-11-30', endMode: 'date', timeRanges: [{ start: '11:00', end: '15:00', days: [0, 1, 2] }] },
  { id:'c3', name:'New Location Opening', createdAt:'2025-10-14', status: 'active', locations: ['ORD'], jobs: ['Cook', 'Server', 'Host'], startDate: '2025-10-14', endDate: '2025-12-01', endMode: 'date', timeRanges: [{ start: '10:00', end: '15:00', days: [0, 1, 2] }, { start: '17:00', end: '21:00', days: [4, 5, 6] }] },
  { id:'c2', name:'Weekend Staffing', createdAt:'2025-09-28', status: 'suspended', locations: ['BOS', 'LGA'], jobs: ['Server'], startDate: '2025-09-28', endBudget: 3000, endMode: 'budget', timeRanges: [{ start: '17:00', end: '23:00', days: [5, 6] }] },
  { id:'c1', name:'Holiday Surge', createdAt:'2025-08-31', status: 'active', locations: ['BOS'], jobs: ['Cook', 'Server', 'Bartender'], startDate: '2025-08-31', endDate: '2025-12-25', endMode: 'date', timeRanges: [{ start: '11:00', end: '21:00', days: [6] }] },
];

interface JobFormData {
  role: string;
  completed: boolean;
  data: any; // Store form data for each job
  timeRanges?: TimeRange[];
}

interface FinalizedJob {
  id: string;
  role: string;
  locations: string[];
  timeRanges: TimeRange[];
  formData: any;
  companyData: any;
  finalizedAt: string;
}

export default function PasscomRecruitingApp() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // Load persisted tab from localStorage
    const saved = localStorage.getItem('passcom-recruiting-active-tab');
    return (saved as Tab) || 'demand';
  });

  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [jobForms, setJobForms] = useState<JobFormData[]>([]);
  // Store finalized job postings in memory for later use
  const [finalizedJobs, setFinalizedJobs] = useState<FinalizedJob[]>([]);
  const [openNewCampaignModal, setOpenNewCampaignModal] = useState(false);

  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);

  // Campaign management functions
  const updateCampaignStatus = (campaignId: string, newStatus: 'active' | 'suspended' | 'draft' | 'archived') => {
    setCampaigns(prev => prev.map(c =>
      c.id === campaignId ? { ...c, status: newStatus } : c
    ));
  };

  const addJobToCampaign = (campaignId: string, jobRole: string, timeRanges: TimeRange[]) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        // Add job if not already in campaign
        const jobs = c.jobs.includes(jobRole) ? c.jobs : [...c.jobs, jobRole];
        return { ...c, jobs };
      }
      return c;
    }));
  };

  const createCampaign = (
    name: string,
    jobRole: string,
    locations: string[],
    timeRanges: TimeRange[],
    startDate: string,
    endMode: 'date' | 'budget' | 'hires',
    endDate?: string,
    endBudget?: number,
    endHires?: number
  ) => {
    const newCampaign: Campaign = {
      id: `c${Date.now()}`,
      name,
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'draft',
      locations,
      jobs: [jobRole],
      startDate,
      endDate,
      endBudget,
      endHires,
      endMode,
      timeRanges,
    };
    setCampaigns(prev => [newCampaign, ...prev]);
    return newCampaign.id;
  };

  // Log finalized jobs when they change (for debugging)
  useEffect(() => {
    if (finalizedJobs.length > 0) {
      console.log('Finalized jobs:', finalizedJobs);
    }
  }, [finalizedJobs]);

  // Update job forms when selected jobs change
  useEffect(() => {
    setJobForms(prev => {
      const newForms = selectedJobs.map(role => {
        const existing = prev.find(f => f.role === role);
        return existing || { role, completed: false, data: {} };
      });
      return newForms;
    });
  }, [selectedJobs]);

  // Persist tab selection
  useEffect(() => {
    localStorage.setItem('passcom-recruiting-active-tab', activeTab);
  }, [activeTab]);

  const handleFinalizeJob = (jobRole: string) => {
    const job = jobForms.find(j => j.role === jobRole);
    if (!job) return;

    const finalizedJob: FinalizedJob = {
      id: `job-${Date.now()}-${jobRole}`,
      role: job.role,
      locations: selectedLocations,
      timeRanges: job.timeRanges || [],
      formData: job.data,
      companyData: {
        name: 'TechCorp Solutions',
        description: 'We are a growing hospitality group operating two high‑volume concepts.',
        culture: ['Collaborative', 'Fast-paced']
      },
      finalizedAt: new Date().toISOString()
    };

    setFinalizedJobs(prev => [...prev, finalizedJob]);
    console.log('Advertisement created:', finalizedJob);

    // Navigate to campaign tab and open modal
    setActiveTab('campaign');
    setOpenNewCampaignModal(true);
  };

  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: 'demand', label: 'Job Posting' },
    { id: 'advertisement', label: 'Advertisement', hidden: true },
    { id: 'campaign', label: 'Manage Campaigns' },
    { id: 'review', label: 'Interviewing' },
    { id: 'profile', label: 'Company Profile' }
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Passcom Recruiting</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            {tabs.filter(tab => !tab.hidden).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-6 py-3 font-medium text-sm transition-all rounded-t-lg
                  ${activeTab === tab.id
                    ? 'text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                style={activeTab === tab.id ? { backgroundColor: '#009cd9' } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'demand' && (
          <div className="h-full">
            <PlanningScreen
              selectedJobs={selectedJobs}
              setSelectedJobs={setSelectedJobs}
              selectedLocations={selectedLocations}
              setSelectedLocations={setSelectedLocations}
              jobForms={jobForms}
              setJobForms={setJobForms}
              onStartHiring={() => setActiveTab('campaign')}
              campaigns={campaigns}
              onUpdateCampaignStatus={updateCampaignStatus}
              onAddJobToCampaign={addJobToCampaign}
              onCreateCampaign={createCampaign}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="h-full overflow-auto bg-gray-50">
            <CompanyProfile />
          </div>
        )}

        {activeTab === 'advertisement' && (
          <div className="h-full overflow-auto bg-gray-50">
            <AdvertisementManager
              selectedJobs={selectedJobs}
              selectedLocations={selectedLocations}
              jobForms={jobForms}
              setJobForms={setJobForms}
              onFinalize={handleFinalizeJob}
            />
          </div>
        )}

        {activeTab === 'campaign' && (
          <div className="h-full overflow-auto">
            <CampaignManager
              selectedLocations={selectedLocations}
              setSelectedLocations={setSelectedLocations}
              selectedJobs={selectedJobs}
              setSelectedJobs={setSelectedJobs}
              advertisements={finalizedJobs}
              openNewCampaignModal={openNewCampaignModal}
              setOpenNewCampaignModal={setOpenNewCampaignModal}
              campaigns={campaigns as any}
              onUpdateCampaigns={setCampaigns}
            />
          </div>
        )}

        {activeTab === 'review' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Interviewing</h2>
              <p className="text-gray-500">Coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

