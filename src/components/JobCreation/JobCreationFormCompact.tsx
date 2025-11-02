import React, { useState } from "react";

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

export default function JobCreationFormCompact(){
  const [culture, setCulture] = useState(["Collaborative","Fast-paced"]);
  const [newTag, setNewTag] = useState("");
  const [skills, setSkills] = useState(["Food Handler","POS (Square)"]);
  const [newSkill, setNewSkill] = useState("");
  const [benefits, setBenefits] = useState(["Health","PTO"]);
  const [newBenefit, setNewBenefit] = useState("");
  const [locations, setLocations] = useState(["123 Main St, Boston, MA"]);
  const [newLoc, setNewLoc] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Company Information */}
        <Card title="Company Information" icon={<span>🏢</span>}>
          <Field span="col-span-12 lg:col-span-8" label="Company Name *">
            <Input placeholder="e.g., TechCorp Solutions" defaultValue="TechCorp Solutions"/>
          </Field>
          <Field span="col-span-12 lg:col-span-4" label="Logo URL">
            <div className="flex gap-2">
              <Input placeholder="https://…"/>
              <button className="h-9 px-3 border rounded">Upload</button>
            </div>
          </Field>

          <Field span="col-span-12" label="Welcome Video URL">
            <Input placeholder="https://example.com/welcome.mp4"/>
          </Field>

          <Field span="col-span-12 lg:col-span-8" label="Company Description *">
            <Textarea placeholder="Tell applicants about your company…" defaultValue="We are a growing hospitality group operating two high‑volume concepts."/>
          </Field>
          <Field span="col-span-12 lg:col-span-4" label="Culture Tags" hint="Press Enter to add">
            <div className="flex flex-wrap gap-2 mb-2">
              {culture.map((t,i)=> <Chip key={i} onRemove={()=>setCulture(prev=>prev.filter((_,j)=>j!==i))}>{t}</Chip>)}
            </div>
            <Input placeholder="Innovative" value={newTag}
              onChange={e=>setNewTag(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter' && newTag.trim()){ setCulture(p=>[...p,newTag.trim()]); setNewTag(""); e.preventDefault(); } }}
            />
          </Field>

          <Field span="col-span-12" label="Visual Media (4-up thumbnails)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map(i=> (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border bg-gray-100 grid place-items-center text-gray-400">IMG {i}</div>
              ))}
            </div>
          </Field>
        </Card>

        {/* Job Details */}
        <Card title="Job Details" icon={<span>🧰</span>}>
          <Field label="Job Title *"><Input placeholder="Line Cook" defaultValue="Line Cook"/></Field>
          <Field label="Primary Location/Address *"><Input placeholder="123 Main St, City, ST" defaultValue="123 Main St, Boston, MA"/></Field>
          <Field span="col-span-12 lg:col-span-4" label="Add Additional Location" hint="Enter to add">
            <Input placeholder="456 Second St…" value={newLoc}
              onChange={e=>setNewLoc(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter' && newLoc.trim()){ setLocations(p=>[...p,newLoc.trim()]); setNewLoc(""); e.preventDefault(); } }}
            />
          </Field>
          <Field span="col-span-12 lg:col-span-8" label="Locations">
            <div className="flex flex-wrap gap-2">
              {locations.map((l,i)=> <Chip key={i} onRemove={()=>setLocations(p=>p.filter((_,j)=>j!==i))}>{l}</Chip>)}
            </div>
          </Field>
          <Field span="col-span-12" label="Job Description *">
            <Textarea placeholder="Responsibilities, station coverage, prep, etc." defaultValue="Prep, grill, sauté; maintain station; follow HACCP; assist with inventory."/>
          </Field>
          <Field span="col-span-12 lg:col-span-8" label="Required Skills" hint="Enter to add; click × to remove">
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
          <Field span="col-span-12 lg:col-span-6" label="Wage/Salary *">
            <div className="flex items-center gap-3">
              <Input placeholder="$16–18/hr" defaultValue="$17/hr"/>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox"/> Tip Eligible</label>
            </div>
          </Field>
          <Field span="col-span-12" label="Wage Details (Optional)">
            <Textarea placeholder="Bonuses, overtime policy, tip‑out details…"/>
          </Field>
          <Field span="col-span-12" label="Benefits" hint="Enter to add">
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
          <Field label="Schedule Type *">
            <select className="w-full h-9 px-2 rounded border border-gray-300">
              <option>Part-time</option>
              <option>Full-time</option>
              <option>Casual</option>
            </select>
          </Field>
          <Field label="Expected Hours *">
            <Input placeholder="20–30 hrs/week" defaultValue="24 hrs/week"/>
          </Field>
          <Field span="col-span-12" label="Schedule Flexibility">
            <Textarea placeholder="We work with school schedules; weekend rotation…"/>
          </Field>
        </Card>

        {/* Questions (two-up cards) */}
        <Card title="Application Questions" icon={<span>❓</span>}>
          <div className="col-span-12 grid grid-cols-12 gap-3">
            {[1,2,3,4].map(i=> (
              <div key={i} className="col-span-12 md:col-span-6">
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2 text-sm"><b>Question {i}</b><button className="text-red-600 hover:underline">Remove</button></div>
                  <Label>Type</Label>
                  <select className="w-full h-9 px-2 rounded border border-gray-300 mb-2">
                    <option>Text</option>
                    <option>Video</option>
                    <option>Multiple Choice</option>
                  </select>
                  <Label>Question Text</Label>
                  <Textarea rows={2} placeholder="Enter your question…"/>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Footer actions */}
        <div className="flex justify-end gap-3">
          <button className="h-9 px-4 border rounded">Cancel</button>
          <button className="h-9 px-4 rounded bg-blue-600 text-white">Save Job Posting</button>
        </div>
      </div>
    </div>
  );
}
