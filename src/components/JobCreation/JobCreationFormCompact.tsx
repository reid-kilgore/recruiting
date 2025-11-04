import React, { useState, useRef, useEffect } from "react";

// Compact, multi-column preview of the Job Ad screen using a 12-col grid.
// No external UI deps; plain inputs so it renders here.

const Card: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }>=({ title, icon, children })=>(
  <div className="bg-white border rounded-xl p-5 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">{icon ?? '⬚'}</div>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
    <div className="grid grid-cols-12 gap-3">{children}</div>
  </div>
);

const Label: React.FC<{ children: React.ReactNode }>=({children})=>(
  <label className="block text-[13px] text-gray-700 mb-1">{children}</label>
);

const Field: React.FC<{ span?: string; hint?: string; children: React.ReactNode; label?: string }>=({span="col-span-12 sm:col-span-6 lg:col-span-4", hint, children, label})=>(
  <div className={span}>
    {label ? <Label>{label}</Label> : null}
    {children}
    {hint ? <div className="mt-1 text-[11px] text-gray-500">{hint}</div> : null}
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={"w-full h-9 px-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 "+(props.className||"")} />
);
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={"w-full min-h-[72px] px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 "+(props.className||"")} />
);

const Chip: React.FC<{ onRemove?: ()=>void; children: React.ReactNode }>=({onRemove, children})=> (
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

interface JobCreationFormCompactProps {
  jobRole?: string;
  onComplete?: () => void;
}

export default function JobCreationFormCompact({ jobRole, onComplete }: JobCreationFormCompactProps = {}){
  const [culture, setCulture] = useState(["Collaborative","Fast-paced"]);
  const [newTag, setNewTag] = useState("");
  const [skills, setSkills] = useState(["Food Handler","POS (Square)"]);
  const [newSkill, setNewSkill] = useState("");
  const [benefits, setBenefits] = useState(["Health","PTO"]);
  const [newBenefit, setNewBenefit] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedJobRole, setSelectedJobRole] = useState<string>(jobRole || "Cook");
  const jobRoles = ["Cook", "Server", "Barista", "Host"];
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [welcomeVideo, setWelcomeVideo] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showLogoEditor, setShowLogoEditor] = useState(false);
  const [logoZoom, setLogoZoom] = useState(1);
  const [logoPan, setLogoPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLocationDropdown]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCompanyLogo(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setWelcomeVideo(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoDoubleClick = () => {
    if (companyLogo) {
      setShowLogoEditor(true);
    }
  };

  const handleZoomIn = () => {
    setLogoZoom(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setLogoZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - logoPan.x, y: e.clientY - logoPan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setLogoPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetLogoEditor = () => {
    setLogoZoom(1);
    setLogoPan({ x: 0, y: 0 });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(index);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(null);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result;
          if (result) {
            setImages(prev => {
              const newImages = [...prev];
              newImages[index] = result as string;
              return newImages;
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Company Information */}
        <Card title="Company Information" icon={<span>🏢</span>}>
          <Field span="col-span-12 lg:col-span-6" label="Company Name">
            <Input placeholder="e.g., TechCorp Solutions" defaultValue="TechCorp Solutions"/>
          </Field>
          
          <Field span="col-span-12 lg:col-span-6" label="Company Website">
            <Input placeholder="https://www.example.com" type="url"/>
          </Field>

          <Field span="col-span-12" label="">
            <div className="flex gap-6 items-start">
              {/* Logo */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] text-gray-700">Logo</span>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Upload
                  </button>
                </div>
                {companyLogo ? (
                  <div 
                    className="relative w-24 h-24 border rounded-lg overflow-hidden bg-white cursor-pointer hover:border-blue-400"
                    onDoubleClick={handleLogoDoubleClick}
                    title="Double-click to adjust position and zoom"
                  >
                    <img src={companyLogo} alt="Company Logo" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setCompanyLogo(null)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 z-10"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    <span className="text-2xl">🏢</span>
                  </div>
                )}
              </div>

              {/* Welcome Video */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] text-gray-700">Welcome Video</span>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Upload
                  </button>
                  {welcomeVideo && (
                    <>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setWelcomeVideo(null)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
                {welcomeVideo ? (
                  <div className="border rounded-lg overflow-hidden bg-black" style={{ width: '192px', height: '96px' }}>
                    <video 
                      src={welcomeVideo} 
                      controls 
                      className="w-full h-full object-cover"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400" style={{ width: '192px', height: '96px' }}>
                    <div className="text-center">
                      <div className="text-2xl mb-1">🎥</div>
                      <div className="text-xs">No video</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Field>

          <Field span="col-span-12 lg:col-span-8" label="Company Description">
            <Textarea placeholder="Tell applicants about your company…" defaultValue="We are a growing hospitality group operating two high‑volume concepts."/>
          </Field>
          <Field span="col-span-12 lg:col-span-4" label="Culture Tags">
            <div className="flex flex-wrap gap-2 mb-2">
              {culture.map((t,i)=> <Chip key={i} onRemove={()=>setCulture(prev=>prev.filter((_,j)=>j!==i))}>{t}</Chip>)}
            </div>
            <Input placeholder="Innovative" value={newTag}
              onChange={e=>setNewTag(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter' && newTag.trim()){ setCulture(p=>[...p,newTag.trim()]); setNewTag(""); e.preventDefault(); } }}
            />
          </Field>

          <Field span="col-span-12" label="Visual Media (4-up thumbnails)">
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
              {images.map((img, i) => (
                <div 
                  key={i}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, i)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 grid place-items-center transition-all ${
                    dragOver === i 
                      ? 'border-blue-500 bg-blue-50' 
                      : img 
                        ? 'border-gray-200' 
                        : 'border-dashed border-gray-300 bg-gray-100'
                  }`}
                >
                  {img ? (
                    <img src={img} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400 p-2">
                      <div className="text-2xl mb-1">📷</div>
                      <div className="text-xs">Drop image here</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Field>
        </Card>

        {/* Job Details */}
        <Card title="Job Details" icon={<span>🧰</span>}>
          <Field label="Title"><Input placeholder="Line Cook" defaultValue="Line Cook"/></Field>
          <Field label="Job Role">
            {jobRole ? (
              <div className="w-full h-9 px-2 rounded border border-gray-200 bg-gray-50 flex items-center text-gray-700">
                {selectedJobRole}
              </div>
            ) : (
              <select 
                className="w-full h-9 px-2 rounded border border-gray-300"
                value={selectedJobRole}
                onChange={(e) => setSelectedJobRole(e.target.value)}
              >
                {jobRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            )}
          </Field>
          <Field span="col-span-12" label="Location">
            <div className="relative" ref={locationDropdownRef}>
              <button 
                type="button"
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="w-full h-9 px-2 rounded border border-gray-300 flex items-center justify-between text-left bg-white hover:border-gray-400"
              >
                <span className="text-gray-700">
                  {selectedLocations.length > 0 ? `${selectedLocations.length} location(s) selected` : 'Select locations...'}
                </span>
                <span className="text-gray-400">▼</span>
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg p-2 z-10">
                  {availableLocations.map((loc, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(loc)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLocations(prev => [...prev, loc]);
                          } else {
                            setSelectedLocations(prev => prev.filter(l => l !== loc));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{loc}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedLocations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedLocations.map((l, i) => (
                  <Chip key={i} onRemove={() => setSelectedLocations(prev => prev.filter(loc => loc !== l))}>
                    {l}
                  </Chip>
                ))}
              </div>
            )}
          </Field>
          <Field span="col-span-12" label="Job Description">
            <Textarea placeholder="Responsibilities, station coverage, prep, etc." defaultValue="Prep, grill, sauté; maintain station; follow HACCP; assist with inventory."/>
          </Field>
          <Field span="col-span-12 lg:col-span-8" label="Required Skills">
            <div className="flex flex-wrap gap-2 mb-2">
              {skills.map((s,i)=> <Chip key={i} onRemove={()=>setSkills(p=>p.filter((_,j)=>j!==i))}>{s}</Chip>)}
            </div>
            <Input placeholder="Knife skills, ServSafe…" value={newSkill}
              onChange={e=>setNewSkill(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter' && newSkill.trim()){ setSkills(p=>[...p,newSkill.trim()]); setNewSkill(""); e.preventDefault(); } }}
            />
          </Field>
        </Card>

        {/* Compensation & Benefits */}
        <Card title="Compensation & Benefits" icon={<span>💵</span>}>
          <Field span="col-span-12 lg:col-span-6">
            <label className="flex items-center gap-2 text-[13px] text-gray-700 mb-1 cursor-pointer">
              <input
                type="radio"
                name="payOption"
                value="exact"
                checked={payOption === "exact"}
                onChange={(e) => setPayOption(e.target.value as "exact" | "range" | "omit")}
                className="w-4 h-4"
              />
              Exact amount
            </label>
            <div className="flex items-center gap-3">
              <Input 
                placeholder="$16–18/hr" 
                defaultValue="$17/hr"
                disabled={payOption !== "exact"}
                className={payOption !== "exact" ? "opacity-50 cursor-not-allowed" : ""}
              />
              <label className="inline-flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  disabled={payOption !== "exact"}
                  className={payOption !== "exact" ? "cursor-not-allowed" : ""}
                /> 
                Tip Eligible
              </label>
            </div>
          </Field>
          <Field span="col-span-12 lg:col-span-6">
            <label className="flex items-center gap-2 text-[13px] text-gray-700 mb-1 cursor-pointer">
              <input
                type="radio"
                name="payOption"
                value="range"
                checked={payOption === "range"}
                onChange={(e) => setPayOption(e.target.value as "exact" | "range" | "omit")}
                className="w-4 h-4"
              />
              Pay range
            </label>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Min (e.g., $15)"
                disabled={payOption !== "range"}
                className={payOption !== "range" ? "opacity-50 cursor-not-allowed" : ""}
              />
              <span className={`text-gray-500 ${payOption !== "range" ? "opacity-50" : ""}`}>to</span>
              <Input 
                placeholder="Max (e.g., $20)"
                disabled={payOption !== "range"}
                className={payOption !== "range" ? "opacity-50 cursor-not-allowed" : ""}
              />
            </div>
          </Field>
          <Field span="col-span-12 lg:col-span-6">
            <label className="flex items-center gap-2 text-[13px] text-gray-700 mb-1 cursor-pointer">
              <input
                type="radio"
                name="payOption"
                value="omit"
                checked={payOption === "omit"}
                onChange={(e) => setPayOption(e.target.value as "exact" | "range" | "omit")}
                className="w-4 h-4"
              />
              Omit pay
            </label>
            <div className={`text-sm ${payOption === "omit" ? "text-gray-600" : "text-gray-400"}`}>
              {payOption === "omit" ? "Compensation information will not be displayed" : ""}
            </div>
          </Field>
          <Field span="col-span-12" label="Wage Details (Optional)">
            <Textarea placeholder="Bonuses, overtime policy, tip‑out details…"/>
          </Field>
          <Field span="col-span-12" label="Benefits">
            <div className="flex flex-wrap gap-2 mb-2">
              {benefits.map((b,i)=> <Chip key={i} onRemove={()=>setBenefits(p=>p.filter((_,j)=>j!==i))}>{b}</Chip>)}
            </div>
            <Input placeholder="Health, PTO, meals…" value={newBenefit}
              onChange={e=>setNewBenefit(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter' && newBenefit.trim()){ setBenefits(p=>[...p,newBenefit.trim()]); setNewBenefit(""); e.preventDefault(); } }}
            />
          </Field>
        </Card>

        {/* Schedule */}
        <Card title="Schedule Information" icon={<span>📅</span>}>
          <Field label="Schedule Type">
            <select className="w-full h-9 px-2 rounded border border-gray-300">
              <option>Part-time</option>
              <option>Full-time</option>
              <option>Casual</option>
            </select>
          </Field>
          <Field span="col-span-12" label="Schedule Flexibility">
            <Textarea placeholder="We work with school schedules; weekend rotation…"/>
          </Field>
        </Card>

        {/* Questions (two-up cards) */}
        <Card title="Application Questions" icon={<span>❓</span>}>
          <div className="col-span-12 grid grid-cols-12 gap-3">
            {questions.map((q) => (
              <div key={q.id} className="col-span-12 md:col-span-6">
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <b>Question {q.id}</b>
                    <button 
                      className="text-red-600 hover:underline"
                      onClick={() => setQuestions(prev => prev.filter(question => question.id !== q.id))}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <Label>Type</Label>
                      <select 
                        className="w-full h-9 px-2 rounded border border-gray-300"
                        value={q.type}
                        onChange={(e) => {
                          const newType = e.target.value as QuestionType;
                          setQuestions(prev => prev.map(question => 
                            question.id === q.id 
                              ? { 
                                  ...question, 
                                  type: newType,
                                  limit: newType === "Text" ? "500" : newType === "Video" ? "60" : "",
                                  choices: newType === "Multiple Choice" ? (question.choices.length > 0 ? question.choices : ["Option 1"]) : []
                                }
                              : question
                          ));
                        }}
                      >
                        <option>Text</option>
                        <option>Video</option>
                        <option>Multiple Choice</option>
                      </select>
                    </div>
                    {q.type !== "Multiple Choice" && (
                      <div>
                        <Label>Limit ({q.type === "Text" ? "characters" : "seconds"})</Label>
                        <Input 
                          type="number"
                          value={q.limit}
                          onChange={(e) => {
                            setQuestions(prev => prev.map(question => 
                              question.id === q.id ? { ...question, limit: e.target.value } : question
                            ));
                          }}
                          placeholder={q.type === "Text" ? "500" : "60"}
                        />
                      </div>
                    )}
                  </div>
                  <Label>Question Text</Label>
                  <Textarea 
                    rows={2} 
                    placeholder="Enter your question…"
                    value={q.text}
                    onChange={(e) => {
                      setQuestions(prev => prev.map(question => 
                        question.id === q.id ? { ...question, text: e.target.value } : question
                      ));
                    }}
                  />
                  {q.type === "Multiple Choice" && (
                    <div className="mt-2">
                      <Label>Answer Options</Label>
                      <div className="space-y-1 mb-2">
                        {q.choices.map((choice, choiceIdx) => (
                          <div key={choiceIdx} className="flex items-center gap-2">
                            <Input 
                              value={choice}
                              onChange={(e) => {
                                setQuestions(prev => prev.map(question => {
                                  if (question.id === q.id) {
                                    const newChoices = [...question.choices];
                                    newChoices[choiceIdx] = e.target.value;
                                    return { ...question, choices: newChoices };
                                  }
                                  return question;
                                }));
                              }}
                              placeholder={`Option ${choiceIdx + 1}`}
                              className="flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setQuestions(prev => prev.map(question => {
                                  if (question.id === q.id) {
                                    return { ...question, choices: question.choices.filter((_, i) => i !== choiceIdx) };
                                  }
                                  return question;
                                }));
                              }}
                              className="h-9 px-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          value={q.newChoice}
                          onChange={(e) => {
                            setQuestions(prev => prev.map(question => 
                              question.id === q.id ? { ...question, newChoice: e.target.value } : question
                            ));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && q.newChoice.trim()) {
                              setQuestions(prev => prev.map(question => 
                                question.id === q.id 
                                  ? { ...question, choices: [...question.choices, q.newChoice.trim()], newChoice: "" }
                                  : question
                              ));
                              e.preventDefault();
                            }
                          }}
                          placeholder="Add new option..."
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (q.newChoice.trim()) {
                              setQuestions(prev => prev.map(question => 
                                question.id === q.id 
                                  ? { ...question, choices: [...question.choices, q.newChoice.trim()], newChoice: "" }
                                  : question
                              ));
                            }
                          }}
                          className="h-9 px-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Footer actions */}
        <div className="flex justify-end gap-3">
          <button className="h-9 px-4 border rounded">Cancel</button>
          {onComplete && (
            <button 
              onClick={onComplete}
              className="h-9 px-4 rounded bg-green-600 text-white hover:bg-green-700"
            >
              Mark as Complete ✓
            </button>
          )}
          <button className="h-9 px-4 rounded bg-blue-600 text-white hover:bg-blue-700">
            {onComplete ? 'Save & Continue' : 'Save Job Posting'}
          </button>
        </div>
      </div>

      {/* Logo Editor Modal */}
      {showLogoEditor && companyLogo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Adjust Logo Position & Zoom</h3>
              <button
                onClick={() => setShowLogoEditor(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div 
              className="relative w-full h-96 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img 
                src={companyLogo} 
                alt="Logo Editor" 
                className="absolute select-none"
                style={{
                  transform: `translate(${logoPan.x}px, ${logoPan.y}px) scale(${logoZoom})`,
                  transformOrigin: 'center',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                draggable={false}
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleZoomOut}
                  className="h-9 px-4 border rounded hover:bg-gray-50"
                >
                  Zoom Out (−)
                </button>
                <span className="text-sm text-gray-600">
                  {Math.round(logoZoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="h-9 px-4 border rounded hover:bg-gray-50"
                >
                  Zoom In (+)
                </button>
              </div>
              <button
                onClick={resetLogoEditor}
                className="h-9 px-4 border rounded hover:bg-gray-50"
              >
                Reset
              </button>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoEditor(false)}
                className="h-9 px-4 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowLogoEditor(false)}
                className="h-9 px-4 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
