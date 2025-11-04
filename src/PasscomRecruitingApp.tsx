import { useState, useEffect } from 'react';
import PlanningScreen from './components/DemandForecast/PlanningScreen';
import JobCreationFormCompact from './components/JobCreation/JobCreationFormCompact';
import CampaignManager from './components/Campaign/CampaignManager';

type Tab = 'demand' | 'advertisement' | 'campaign' | 'review';

interface JobFormData {
  role: string;
  completed: boolean;
  data: any; // Store form data for each job
}

export default function PasscomRecruitingApp() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // Load persisted tab from localStorage
    const saved = localStorage.getItem('passcom-recruiting-active-tab');
    return (saved as Tab) || 'demand';
  });

  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [jobForms, setJobForms] = useState<JobFormData[]>([]);
  const [activeJobTab, setActiveJobTab] = useState(0);

  // Update job forms when selected jobs change
  useEffect(() => {
    setJobForms(prev => {
      const newForms = selectedJobs.map(role => {
        const existing = prev.find(f => f.role === role);
        return existing || { role, completed: false, data: {} };
      });
      return newForms;
    });
    if (selectedJobs.length > 0 && activeJobTab >= selectedJobs.length) {
      setActiveJobTab(0);
    }
  }, [selectedJobs, activeJobTab]);

  // Persist tab selection
  useEffect(() => {
    localStorage.setItem('passcom-recruiting-active-tab', activeTab);
  }, [activeTab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'demand', label: 'Demand' },
    { id: 'advertisement', label: 'Advertisement' },
    { id: 'campaign', label: 'Campaign' },
    { id: 'review', label: 'Review' }
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
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'demand' && (
          <div className="h-full">
            <PlanningScreen 
              selectedJobs={selectedJobs} 
              setSelectedJobs={setSelectedJobs}
            />
          </div>
        )}
        
        {activeTab === 'advertisement' && (
          <div className="h-full overflow-auto bg-gray-50">
            {selectedJobs.length > 1 ? (
              // Multi-job interface with sub-tabs
              <div className="h-full flex flex-col">
                {/* Job Sub-Tabs */}
                <div className="bg-white border-b px-6 py-3">
                  <div className="max-w-6xl mx-auto">
                    <div className="flex gap-2 overflow-x-auto">
                      {jobForms.map((job, index) => (
                        <button
                          key={job.role}
                          onClick={() => setActiveJobTab(index)}
                          className={`
                            px-4 py-2 rounded-t-lg font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap
                            ${activeJobTab === index
                              ? job.completed 
                                ? 'bg-green-600 text-white' 
                                : 'bg-blue-600 text-white'
                              : job.completed
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }
                          `}
                        >
                          <span>{job.role}</span>
                          {job.completed && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Active Job Form */}
                <div className="flex-1 overflow-auto">
                  {jobForms[activeJobTab] && (
                    <JobCreationFormCompact 
                      key={jobForms[activeJobTab].role}
                      jobRole={jobForms[activeJobTab].role}
                      onComplete={() => {
                        setJobForms(prev => prev.map((f, i) => 
                          i === activeJobTab ? { ...f, completed: true } : f
                        ));
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              // Single job or no selection - show default form
              <JobCreationFormCompact />
            )}
          </div>
        )}
        
        {activeTab === 'campaign' && (
          <div className="h-full overflow-auto">
            <CampaignManager />
          </div>
        )}
        
        {activeTab === 'review' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Review</h2>
              <p className="text-gray-500">Coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

