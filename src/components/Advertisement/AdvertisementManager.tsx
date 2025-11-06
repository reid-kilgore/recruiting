import { useState } from 'react';
import JobFormSections from './JobFormSections';

interface TimeRange {
  start: string;
  end: string;
  days?: number[]; // Array of day indices (0=Mon, 1=Tue, etc.)
}

interface JobFormData {
  role: string;
  completed: boolean;
  data: any;
  timeRanges?: TimeRange[];
}

interface AdvertisementManagerProps {
  selectedJobs: string[];
  selectedLocations: string[];
  jobForms: JobFormData[];
  setJobForms: React.Dispatch<React.SetStateAction<JobFormData[]>>;
  onFinalize: (jobRole: string) => void;
}

export default function AdvertisementManager({ selectedJobs, selectedLocations, jobForms, setJobForms, onFinalize }: AdvertisementManagerProps) {
  const [activeJobTab, setActiveJobTab] = useState(0);

  if (selectedJobs.length === 0) {
    // No jobs selected - show placeholder
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="text-center py-12 bg-white rounded-xl border">
            <p className="text-gray-500">Select jobs from the Demand tab to create advertisements</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Job Tabs */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* Job Tab Headers */}
          <div className="border-b bg-gray-50 px-4 pt-3">
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
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-b-0'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-b-0'
                    }
                  `}
                >
                  <span>{job.role}</span>
                  {job.completed && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Active Job Content with Sub-tabs */}
          <div className="p-6">
            {jobForms[activeJobTab] && (
              <JobFormSections
                jobRole={jobForms[activeJobTab].role}
                timeRanges={jobForms[activeJobTab].timeRanges}
                selectedLocations={selectedLocations}
                onComplete={() => {
                  setJobForms(prev => prev.map((f, i) =>
                    i === activeJobTab ? { ...f, completed: true } : f
                  ));
                }}
                onFinalize={onFinalize}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

