const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDays = (days?: number[]): string => {
  if (!days || days.length === 0) return '';
  if (days.length === 7) return 'All days';
  return days.map(d => DAYS[d]).join(', ');
};

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

interface JobPostingPreviewProps {
  jobForms: JobFormData[];
  selectedLocations: string[];
  onFinalize: (jobId: string) => void;
}

export default function JobPostingPreview({ jobForms, selectedLocations, onFinalize }: JobPostingPreviewProps) {
  if (jobForms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 bg-white rounded-xl border">
            <p className="text-gray-500">No job postings to preview. Create job advertisements first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {jobForms.map((job) => (
          <div key={job.role} className="bg-white rounded-xl border shadow-sm p-6">
            {/* Header */}
            <div className="border-b pb-4 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{job.role}</h2>
                  <div className="text-sm text-gray-600 mt-1">
                    TechCorp Solutions • {selectedLocations.join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {job.completed && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Complete
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">About the Company</h3>
              <p className="text-sm text-gray-600">
                We are a growing hospitality group operating two high‑volume concepts.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Collaborative</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Fast-paced</span>
              </div>
            </div>

            {/* Job Description */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Job Description</h3>
              <p className="text-sm text-gray-600">
                Describe duties and environment…
              </p>
            </div>

            {/* Skills */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">Food Handler</span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">POS (Square)</span>
              </div>
            </div>

            {/* Compensation */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Compensation & Benefits</h3>
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Pay:</span> $18.50/hour
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">Health</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">PTO</span>
              </div>
            </div>

            {/* Schedule */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Schedule</h3>
              <div className="text-sm text-gray-600 mb-2">Full-time</div>
              {job.timeRanges && job.timeRanges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {job.timeRanges.map((range, idx) => (
                    <div key={idx} className="inline-flex flex-col bg-purple-50 text-purple-700 rounded px-2 py-1">
                      <span className="text-xs font-mono font-medium">{range.start} - {range.end}</span>
                      {range.days && range.days.length > 0 && (
                        <span className="text-[10px] text-purple-600">{formatDays(range.days)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Application Questions */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Application Questions</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>1. Text question (500 character limit)</div>
                <div>2. Video question (60 second limit)</div>
                <div>3. Multiple choice question</div>
              </div>
            </div>

            {/* Finalize Button */}
            <div className="border-t pt-4">
              <button
                onClick={() => onFinalize(job.role)}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Finalize Job Posting
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
