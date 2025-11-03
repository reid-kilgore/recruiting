import { useState, useEffect } from 'react';
import PlanningScreen from './components/DemandForecast/PlanningScreen';
import JobCreationFormCompact from './components/JobCreation/JobCreationFormCompact';

type Tab = 'demand' | 'advertisement' | 'campaign' | 'review';

export default function PasscomRecruitingApp() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // Load persisted tab from localStorage
    const saved = localStorage.getItem('passcom-recruiting-active-tab');
    return (saved as Tab) || 'demand';
  });

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
            <PlanningScreen />
          </div>
        )}
        
        {activeTab === 'advertisement' && (
          <div className="h-full overflow-auto">
            <JobCreationFormCompact />
          </div>
        )}
        
        {activeTab === 'campaign' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Campaign</h2>
              <p className="text-gray-500">Coming soon...</p>
            </div>
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

