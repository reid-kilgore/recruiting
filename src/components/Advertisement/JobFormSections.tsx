import React, { useState, useRef, useEffect } from 'react';

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

interface JobFormSectionsProps {
  jobRole: string;
  onComplete?: () => void;
}

type SectionTab = 'details' | 'compensation' | 'schedule' | 'questions';

export default function JobFormSections({ jobRole: _jobRole, onComplete }: JobFormSectionsProps) {
  // jobRole is used by parent for identification, not displayed since it's shown in the tab
  const [activeSection, setActiveSection] = useState<SectionTab>('details');
  const [skills, setSkills] = useState(["Food Handler", "POS (Square)"]);
  const [newSkill, setNewSkill] = useState("");
  const [benefits, setBenefits] = useState(["Health", "PTO"]);
  const [newBenefit, setNewBenefit] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const [payOption, setPayOption] = useState<"exact" | "range" | "omit">("exact");
  const [questions, setQuestions] = useState<Question[]>([
    { id: 1, type: "Text", text: "", limit: "500", choices: [], newChoice: "" },
    { id: 2, type: "Video", text: "", limit: "60", choices: [], newChoice: "" },
    { id: 3, type: "Multiple Choice", text: "", limit: "", choices: ["Option 1", "Option 2"], newChoice: "" },
    { id: 4, type: "Text", text: "", limit: "500", choices: [], newChoice: "" }
  ]);
  const availableLocations = [
    "123 Main St, Boston, MA",
    "456 Second St, Cambridge, MA",
    "789 Third Ave, Brookline, MA",
    "321 Park Blvd, Somerville, MA"
  ];

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    if (showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLocationDropdown]);

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

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
    { id: 'compensation' as SectionTab, label: 'Compensation & Benefits' },
    { id: 'schedule' as SectionTab, label: 'Schedule Information' },
    { id: 'questions' as SectionTab, label: 'Application Questions' }
  ];

  return (
    <div className="space-y-4">
      {/* Section Tabs */}
      <div className="border-b">
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
      </div>

      {/* Section Content */}
      <div className="space-y-4">
        {activeSection === 'details' && (
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-12 gap-3">
              <Field label="Title"><Input placeholder="Line Cook" defaultValue="Line Cook" /></Field>
            <Field span="col-span-12" label="Location">
              <div className="relative" ref={locationDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className="w-full border rounded px-2 py-2 text-sm bg-white text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="truncate">
                    {selectedLocations.length === 0 ? 'Select locations...' : selectedLocations.join('; ')}
                  </span>
                  <span className="ml-2">▼</span>
                </button>
                {showLocationDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                    {availableLocations.map((loc) => (
                      <label key={loc} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLocations.includes(loc)}
                          onChange={() => toggleLocation(loc)}
                          className="mr-2"
                        />
                        <span className="text-sm">{loc}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <Field span="col-span-12" label="Job Description">
              <Textarea placeholder="Describe duties and environment…" rows={4} />
            </Field>

            <Field span="col-span-12 lg:col-span-6" label="Required Skills">
              <div className="flex flex-wrap gap-2 mb-2">
                {skills.map((s, i) => <Chip key={i} onRemove={() => setSkills(prev => prev.filter((_, j) => j !== i))}>{s}</Chip>)}
              </div>
              <Input placeholder="e.g., ServSafe" value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newSkill.trim()) { setSkills(p => [...p, newSkill.trim()]); setNewSkill(""); e.preventDefault(); } }}
              />
            </Field>
            </div>
          </div>
        )}

        {activeSection === 'compensation' && (
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-12 gap-3">
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
              <Input placeholder="e.g., $18.50" disabled={payOption !== "exact"} className={payOption !== "exact" ? "opacity-50" : ""} />
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
            </div>
          </div>
        )}

        {activeSection === 'schedule' && (
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-12 gap-3">
              <Field label="Schedule Type">
              <select className="w-full h-9 px-2 rounded border border-gray-300">
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Flexible</option>
              </select>
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
              <div className="col-span-12">
                <button onClick={addQuestion} className="text-sm text-blue-600 hover:underline">+ Add Question</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {onComplete && (
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500 italic">
            Changes are saved automatically
          </div>
          <button
            onClick={onComplete}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            Mark as Complete ✓
          </button>
        </div>
      )}
    </div>
  );
}

