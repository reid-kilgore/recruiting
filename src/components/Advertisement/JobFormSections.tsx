import React, { useState } from 'react';

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDays = (days?: number[]): string => {
  if (!days || days.length === 0) return '';
  if (days.length === 7) return 'All days';
  return days.map(d => DAYS[d]).join(', ');
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[13px] text-gray-700 mb-1">{children}</label>
);

const Field: React.FC<{ span?: string; hint?: string; children: React.ReactNode; label?: string }> = ({ span = "col-span-12 sm:col-span-6 lg:col-span-4", hint, children, label }) => (
  <div className={span}>
    {label ? <Label>{label}</Label> : null}
    {children}
    {hint ? <div className="mt-1 text-[11px] text-gray-500">{hint}</div> : null}
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={"w-full h-9 px-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 " + (props.className || "")} />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={"w-full min-h-[72px] px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 " + (props.className || "")} />
);

const Chip: React.FC<{ onRemove?: () => void; children: React.ReactNode }> = ({ onRemove, children }) => (
  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2 h-7 text-xs">
    {children}
    {onRemove && (
      <button type="button" onClick={onRemove} className="w-4 h-4 grid place-items-center rounded-full hover:bg-red-100 text-red-600">×</button>
    )}
  </span>
);

type QuestionType = "Text" | "Video" | "Multiple Choice";

interface Question {
  id: number;
  type: QuestionType;
  text: string;
  limit: string;
  choices: string[];
  newChoice: string;
}

interface TimeRange {
  start: string;
  end: string;
  days?: number[]; // Array of day indices (0=Mon, 1=Tue, etc.)
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'draft';
  locations: string[];
  jobs: string[];
}

interface JobFormSectionsProps {
  jobRole: string;
  onComplete?: () => void;
  timeRanges?: TimeRange[];
  selectedLocations: string[];
  onFinalize: (jobRole: string) => void;
  jobFormData?: any;
  onUpdateJobData?: (data: any) => void;
  campaigns?: Campaign[];
  onNavigateToCampaign?: () => void;
  onAddJobToCampaign?: (campaignId: string) => void;
  onCreateCampaign?: (
    name: string,
    startDate: string,
    endMode: 'date' | 'budget' | 'hires',
    endDate?: string,
    endBudget?: number,
    endHires?: number
  ) => string;
}

type SectionTab = 'details' | 'questions' | 'preview';

const SECTION_ORDER: SectionTab[] = ['details', 'questions', 'preview'];

export default function JobFormSections({ jobRole: _jobRole, onComplete, timeRanges, selectedLocations, onFinalize, jobFormData = {}, onUpdateJobData, campaigns = [], onNavigateToCampaign, onAddJobToCampaign, onCreateCampaign }: JobFormSectionsProps) {
  // jobRole is used by parent for identification, not displayed since it's shown in the tab
  const [activeSection, setActiveSection] = useState<SectionTab>('details');
  const [showAddToExistingModal, setShowAddToExistingModal] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);

  const [description, setDescription] = useState(jobFormData.description || "");
  const [skills, setSkills] = useState(jobFormData.skills || ["Food Handler", "POS (Square)"]);
  const [newSkill, setNewSkill] = useState("");
  const [benefits, setBenefits] = useState(jobFormData.benefits || ["Health", "PTO"]);
  const [newBenefit, setNewBenefit] = useState("");
  const [payOption, setPayOption] = useState<"exact" | "range" | "omit">(jobFormData.payOption || "exact");
  const [payExact, setPayExact] = useState(jobFormData.payExact || "18.50");
  const [tipEligible, setTipEligible] = useState(jobFormData.tipEligible || false);

  const goToNextSection = () => {
    const currentIndex = SECTION_ORDER.indexOf(activeSection);

    // When leaving details section, update parent with job data
    if (activeSection === 'details' && onUpdateJobData) {
      onUpdateJobData({
        description,
        skills,
        benefits,
        payOption,
        pay: payOption === 'exact' ? `$${payExact}/hour` : payOption === 'omit' ? 'Not disclosed' : 'Range',
        payExact,
        tipEligible,
      });
    }

    if (currentIndex < SECTION_ORDER.length - 1) {
      setActiveSection(SECTION_ORDER[currentIndex + 1]);
    }
  };

  const isLastSection = activeSection === SECTION_ORDER[SECTION_ORDER.length - 1];
  const buttonText = 'Next →';
  const [questions, setQuestions] = useState<Question[]>([
    { id: 1, type: "Text", text: "", limit: "500", choices: [], newChoice: "" },
    { id: 2, type: "Video", text: "", limit: "60", choices: [], newChoice: "" },
    { id: 3, type: "Multiple Choice", text: "", limit: "", choices: ["Option 1", "Option 2"], newChoice: "" },
    { id: 4, type: "Text", text: "", limit: "500", choices: [], newChoice: "" }
  ]);

  const addQuestion = () => {
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    setQuestions([...questions, { id: newId, type: "Text", text: "", limit: "500", choices: [], newChoice: "" }]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: number, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const addChoice = (id: number) => {
    const q = questions.find(q => q.id === id);
    if (q && q.newChoice.trim()) {
      updateQuestion(id, {
        choices: [...q.choices, q.newChoice.trim()],
        newChoice: ""
      });
    }
  };

  const removeChoice = (questionId: number, choiceIndex: number) => {
    const q = questions.find(q => q.id === questionId);
    if (q) {
      updateQuestion(questionId, {
        choices: q.choices.filter((_, i) => i !== choiceIndex)
      });
    }
  };

  const sections = [
    { id: 'details' as SectionTab, label: 'Job Details' },
    { id: 'questions' as SectionTab, label: 'Application Questions' },
    { id: 'preview' as SectionTab, label: 'Preview' }
  ];

  return (
    <div className="space-y-4">
      {/* Section Tabs */}
      <div className="border-b">
        <div className="flex gap-1 items-center justify-between">
          <div className="flex gap-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${
                  activeSection === section.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
          {!isLastSection && (
            <button
              onClick={goToNextSection}
              className="px-6 py-2 rounded-lg font-medium text-sm transition bg-blue-600 text-white hover:bg-blue-700"
            >
              {buttonText}
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons - Show on preview tab */}
      {activeSection === 'preview' && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddToExistingModal(true)}
            className="flex-1 px-6 py-2 rounded-lg font-medium text-sm transition text-white"
            style={{ backgroundColor: '#009cd9' }}
          >
            Add to Existing Campaign
          </button>
          <button
            onClick={() => setShowCreateCampaignModal(true)}
            className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition"
          >
            Create Campaign
          </button>
        </div>
      )}

      {/* Section Content */}
      <div className="space-y-4">
        {activeSection === 'details' && (
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-12 gap-3">
              <Field label="Title"><Input placeholder="Line Cook" defaultValue="Line Cook" /></Field>

            {/* Two column layout for description and other details */}
            <div className="col-span-12 grid grid-cols-2 gap-4">
              {/* Left: Job Description */}
              <Field span="col-span-1" label="Job Description">
                <Textarea
                  placeholder="Describe duties and environment…"
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              {/* Right: Skills, Schedule, Time Ranges */}
              <div className="col-span-1 space-y-3">
                <Field span="col-span-12" label="Required Skills">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map((s, i) => <Chip key={i} onRemove={() => setSkills(prev => prev.filter((_, j) => j !== i))}>{s}</Chip>)}
                  </div>
                  <Input placeholder="e.g., ServSafe" value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newSkill.trim()) { setSkills(p => [...p, newSkill.trim()]); setNewSkill(""); e.preventDefault(); } }}
                  />
                </Field>

                {/* Schedule Information */}
                <Field span="col-span-12" label="Schedule Type">
                  <select className="w-full h-9 px-2 rounded border border-gray-300">
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Flexible</option>
                  </select>
                </Field>

                <Field span="col-span-12" label="Priority Time Ranges">
                  {timeRanges && timeRanges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {timeRanges.map((range, idx) => (
                        <div
                          key={idx}
                          className="inline-flex flex-col text-blue-800 px-3 py-1 rounded text-sm"
                          style={{ backgroundColor: '#e0f5fc', color: '#009cd9' }}
                        >
                          <span className="font-medium">{range.start} - {range.end}</span>
                          {range.days && range.days.length > 0 && (
                            <span className="text-xs">{formatDays(range.days)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      No priority time ranges selected.
                    </div>
                  )}
                </Field>
              </div>
            </div>

            {/* Compensation & Benefits */}
            <Field span="col-span-12 lg:col-span-6">
              <label className="flex items-center gap-2 text-[13px] text-gray-700 mb-1 cursor-pointer">
                <input
                  type="radio"
                  name="payOption"
                  checked={payOption === "exact"}
                  onChange={() => setPayOption("exact")}
                  className="w-4 h-4"
                />
                Exact amount
              </label>
              <Input
                placeholder="e.g., $18.50"
                value={payExact}
                onChange={(e) => setPayExact(e.target.value)}
                disabled={payOption !== "exact"}
                className={payOption !== "exact" ? "opacity-50" : ""}
              />
            </Field>

            <Field span="col-span-12 lg:col-span-6">
              <label className="flex items-center gap-2 text-[13px] text-gray-700 mb-1 cursor-pointer">
                <input
                  type="radio"
                  name="payOption"
                  checked={payOption === "range"}
                  onChange={() => setPayOption("range")}
                  className="w-4 h-4"
                />
                Pay range
              </label>
              <div className="flex gap-2 items-center">
                <Input placeholder="Min" disabled={payOption !== "range"} className={payOption !== "range" ? "opacity-50" : ""} />
                <span className="text-gray-400">–</span>
                <Input placeholder="Max" disabled={payOption !== "range"} className={payOption !== "range" ? "opacity-50" : ""} />
              </div>
            </Field>

            <Field span="col-span-12">
              <label className="flex items-center gap-2 text-[13px] text-gray-700 mb-1 cursor-pointer">
                <input
                  type="radio"
                  name="payOption"
                  checked={payOption === "omit"}
                  onChange={() => setPayOption("omit")}
                  className="w-4 h-4"
                />
                Omit pay
              </label>
              <div className={`text-sm ${payOption === "omit" ? "text-gray-600" : "text-gray-400"}`}>
                {payOption === "omit" ? "Compensation information will not be displayed" : ""}
              </div>
            </Field>

            <Field span="col-span-12 lg:col-span-6" label="Benefits">
              <div className="flex flex-wrap gap-2 mb-2">
                {benefits.map((b, i) => <Chip key={i} onRemove={() => setBenefits(prev => prev.filter((_, j) => j !== i))}>{b}</Chip>)}
              </div>
              <Input placeholder="e.g., 401(k)" value={newBenefit}
                onChange={e => setNewBenefit(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newBenefit.trim()) { setBenefits(p => [...p, newBenefit.trim()]); setNewBenefit(""); e.preventDefault(); } }}
              />
            </Field>

            <Field span="col-span-12 lg:col-span-6" label="Tip Eligibility">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={tipEligible}
                  onChange={(e) => setTipEligible(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>Position is eligible for tips</span>
              </label>
            </Field>
            </div>
          </div>
        )}

        {activeSection === 'questions' && (
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 grid grid-cols-12 gap-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="col-span-12 lg:col-span-6 border rounded p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">Question {idx + 1}</span>
                    <button onClick={() => removeQuestion(q.id)} className="text-red-600 hover:underline text-xs">Remove</button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        className="flex-1 h-8 px-2 rounded border border-gray-300 text-sm"
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, {
                          type: e.target.value as QuestionType,
                          limit: e.target.value === "Video" ? "60" : "500",
                          choices: e.target.value === "Multiple Choice" ? (q.choices.length > 0 ? q.choices : ["Option 1"]) : []
                        })}
                      >
                        <option>Text</option>
                        <option>Video</option>
                        <option>Multiple Choice</option>
                      </select>
                      {(q.type === "Text" || q.type === "Video") && (
                        <input
                          type="number"
                          placeholder="Limit"
                          value={q.limit}
                          onChange={(e) => updateQuestion(q.id, { limit: e.target.value })}
                          className="w-20 h-8 px-2 rounded border border-gray-300 text-sm"
                        />
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Question text"
                      value={q.text}
                      onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                      className="w-full h-8 px-2 rounded border border-gray-300 text-sm"
                    />
                    {q.type === "Multiple Choice" && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Answer Options:</div>
                        {q.choices.map((choice, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="flex-1 text-sm px-2 py-1 bg-white rounded border">{choice}</span>
                            <button onClick={() => removeChoice(q.id, i)} className="text-red-600 text-xs">×</button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="New option"
                            value={q.newChoice}
                            onChange={(e) => updateQuestion(q.id, { newChoice: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') { addChoice(q.id); e.preventDefault(); } }}
                            className="flex-1 h-8 px-2 rounded border border-gray-300 text-sm"
                          />
                          <button onClick={() => addChoice(q.id)} className="px-2 h-8 bg-blue-600 text-white rounded text-xs">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
              <div className="col-span-12 flex gap-3">
                <button onClick={addQuestion} className="text-sm text-blue-600 hover:underline">+ Add Question</button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition">
                  Select From Question Bank
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'preview' && (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            {/* Header */}
            <div className="border-b pb-4 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{_jobRole}</h2>
                  <div className="text-sm text-gray-600 mt-1">
                    TechCorp Solutions • {selectedLocations.join(', ')}
                  </div>
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
            {description && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Job Description</h3>
                <p className="text-sm text-gray-600">
                  {description}
                </p>
              </div>
            )}

            {/* Skills */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>
                ))}
              </div>
            </div>

            {/* Compensation */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Compensation & Benefits</h3>
              {payOption !== 'omit' && (
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Pay:</span> {payOption === 'exact' ? `$${payExact}/hour` : 'Range to be discussed'}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {benefits.map((b, i) => (
                  <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">{b}</span>
                ))}
              </div>
              {tipEligible && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">✓</span> Tip eligible position
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Schedule</h3>
              <div className="text-sm text-gray-600 mb-2">Full-time</div>
              {timeRanges && timeRanges.length > 0 && (
                <>
                  <div className="text-xs font-medium text-gray-600 mb-1">Priority Time Ranges:</div>
                  <div className="flex flex-wrap gap-2">
                    {timeRanges.map((range, idx) => (
                      <div key={idx} className="inline-flex flex-col bg-purple-50 text-purple-700 rounded px-2 py-1">
                        <span className="text-xs font-mono font-medium">{range.start} - {range.end}</span>
                        {range.days && range.days.length > 0 && (
                          <span className="text-[10px] text-purple-600">{formatDays(range.days)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Application Questions */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Application Questions</h3>
              <div className="space-y-2 text-sm text-gray-600">
                {questions.map((q, idx) => (
                  <div key={q.id}>
                    {idx + 1}. {q.type} question {q.limit && `(${q.limit} ${q.type === 'Video' ? 'second' : 'character'} limit)`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add to Existing Campaign Modal */}
      {showAddToExistingModal && (() => {
        const [selectedCampaignId, setSelectedCampaignId] = React.useState<string>('');

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddToExistingModal(false)}>
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Add to Existing Campaign</h2>
                  <button
                    onClick={() => setShowAddToExistingModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Select a campaign to add this job posting to:
                  </p>

                  {/* Campaign list */}
                  {campaigns.length === 0 ? (
                    <div className="p-4 border rounded-lg text-center text-gray-500">
                      No campaigns created yet. Create a campaign first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-2">
                      {campaigns.map(campaign => (
                        <button
                          key={campaign.id}
                          onClick={() => setSelectedCampaignId(campaign.id)}
                          className={`w-full text-left p-3 border rounded-lg transition ${
                            selectedCampaignId === campaign.id
                              ? 'bg-blue-50'
                              : 'hover:border-gray-400'
                          }`}
                          style={selectedCampaignId === campaign.id ? { borderColor: '#009cd9' } : {}}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">{campaign.name}</div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              campaign.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : campaign.status === 'suspended'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {campaign.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {campaign.locations.join(', ')} • {campaign.jobs.join(', ')}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddToExistingModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedCampaignId && onAddJobToCampaign) {
                        onAddJobToCampaign(selectedCampaignId);
                        setShowAddToExistingModal(false);
                        if (onNavigateToCampaign) {
                          onNavigateToCampaign();
                        }
                      } else if (!selectedCampaignId) {
                        alert('Please select a campaign first');
                      }
                    }}
                    className="flex-1 px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition"
                    style={{ backgroundColor: '#009cd9' }}
                    disabled={!selectedCampaignId}
                  >
                    Add to Campaign
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create Campaign Modal */}
      {showCreateCampaignModal && (() => {
        const [campaignName, setCampaignName] = React.useState(`${_jobRole} Campaign`);
        const today = new Date();
        const [startDate, setStartDate] = React.useState(today.toISOString().slice(0, 10));
        const [endMode, setEndMode] = React.useState<'budget' | 'hires' | 'date'>('date');
        const [endBudget, setEndBudget] = React.useState(1000);
        const [endHires, setEndHires] = React.useState(10);
        const tmpEnd = new Date(); tmpEnd.setDate(tmpEnd.getDate() + 30);
        const [endDate, setEndDate] = React.useState(tmpEnd.toISOString().slice(0, 10));

        const Field = ({label, children, active = false}: {label: string; children: React.ReactNode; active?: boolean})=> (
          <div className={`relative border rounded-md px-2 pt-2 pb-1 bg-white min-h-[38px] ${active ? 'border-gray-600' : 'border-gray-400'}`}>
            <div className="absolute left-2 -top-2 bg-white px-1 text-[11px] text-gray-500">{label}</div>
            {children}
          </div>
        );
        const inputBase = "w-full bg-transparent outline-none text-sm py-1";

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateCampaignModal(false)}>
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Create New Campaign</h2>
                  <button
                    onClick={() => setShowCreateCampaignModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Campaign Name */}
                <div className="mb-4">
                  <Field label="Campaign Name" active={true}>
                    <input
                      value={campaignName}
                      onChange={e => setCampaignName(e.target.value)}
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
                  <div className="text-xs text-gray-600 mb-2">Campaign End Criteria</div>
                  <div className="flex items-center gap-2">
                    {/* Budget */}
                    <input
                      aria-label="Budget radio"
                      type="radio"
                      name="endMode"
                      checked={endMode === 'budget'}
                      onChange={() => setEndMode('budget')}
                      className={endMode === 'budget' ? 'accent-black shrink-0' : 'accent-gray-400 shrink-0'}
                    />
                    <div className={`flex-1 ${endMode === 'budget' ? '' : 'opacity-60'}`}>
                      <Field label="Budget" active={endMode === 'budget'}>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={endBudget}
                          onChange={e => setEndBudget(Math.max(0, Math.floor(Number(e.target.value || 0))))}
                          disabled={endMode !== 'budget'}
                          className={inputBase}
                        />
                      </Field>
                    </div>

                    {/* Hires */}
                    <input
                      aria-label="Hires radio"
                      type="radio"
                      name="endMode"
                      checked={endMode === 'hires'}
                      onChange={() => setEndMode('hires')}
                      className={endMode === 'hires' ? 'accent-black shrink-0' : 'accent-gray-400 shrink-0'}
                    />
                    <div className={`flex-1 ${endMode === 'hires' ? '' : 'opacity-60'}`}>
                      <Field label="Hires" active={endMode === 'hires'}>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={endHires}
                          onChange={e => setEndHires(Math.max(0, Math.floor(Number(e.target.value || 0))))}
                          disabled={endMode !== 'hires'}
                          className={inputBase}
                        />
                      </Field>
                    </div>

                    {/* End Date */}
                    <input
                      aria-label="End date radio"
                      type="radio"
                      name="endMode"
                      checked={endMode === 'date'}
                      onChange={() => setEndMode('date')}
                      className={endMode === 'date' ? 'accent-black shrink-0' : 'accent-gray-400 shrink-0'}
                    />
                    <div className={`flex-1 ${endMode === 'date' ? '' : 'opacity-60'}`}>
                      <Field label="End Date" active={endMode === 'date'}>
                        <input
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          disabled={endMode !== 'date'}
                          className={inputBase}
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateCampaignModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (onCreateCampaign && campaignName.trim()) {
                        const campaignId = onCreateCampaign(
                          campaignName,
                          startDate,
                          endMode,
                          endMode === 'date' ? endDate : undefined,
                          endMode === 'budget' ? endBudget : undefined,
                          endMode === 'hires' ? endHires : undefined
                        );
                        setShowCreateCampaignModal(false);
                        if (onNavigateToCampaign) {
                          onNavigateToCampaign();
                        }
                      } else if (!campaignName.trim()) {
                        alert('Please enter a campaign name');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    Create Campaign
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

