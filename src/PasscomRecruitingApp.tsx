import { useState, useEffect } from 'react';
import PlanningScreen from './components/DemandForecast/PlanningScreen';
import CampaignManager from './components/Campaign/CampaignManager';
import AdvertisementManager from './components/Advertisement/AdvertisementManager';
import CompanyProfile from './components/CompanyProfile/CompanyProfile';
import JobPostingPreview from './components/Preview/JobPostingPreview';

type Tab = 'demand' | 'advertisement' | 'campaign' | 'review' | 'profile';

interface TimeRange {
  start: string; // e.g., "08:00"
  end: string;   // e.g., "17:00"
  days?: number[]; // Array of day indices (0=Mon, 1=Tue, etc.)
}

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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'demand', label: 'Demand' },
    { id: 'advertisement', label: 'Advertisement' },
    { id: 'campaign', label: 'Campaign' },
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
          <div className="flex gap-2 items-center justify-between">
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-6 py-3 font-medium text-sm transition-all
                    ${activeTab === tab.id
                      ? 'bg-blue-600 text-white rounded-t-lg shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t-lg'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Target Tag */}
            <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm">
              {selectedLocations.length === 0 && selectedJobs.length === 0 ? (
                <span className="text-gray-500 italic">Choose Locations & Jobs to recruit</span>
              ) : (
                <div className="flex items-center gap-2">
                  {selectedLocations.length > 0 && (
                    <span className="text-gray-700">
                      <span className="font-medium">Locations:</span> {selectedLocations.join(', ')}
                    </span>
                  )}
                  {selectedLocations.length > 0 && selectedJobs.length > 0 && (
                    <span className="text-gray-400">|</span>
                  )}
                  {selectedJobs.length > 0 && (
                    <span className="text-gray-700">
                      <span className="font-medium">Jobs:</span> {selectedJobs.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
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
              onStartHiring={() => setActiveTab('advertisement')}
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

