import React, { useEffect, useMemo, useState } from "react";
import type {
  AppData,
  EquipmentItem,
  EstimateLine,
  FieldMoistureReading,
  Job,
  JobStatus,
  LossType,
  XactCategory,
} from "./types";
import { loadData, makeJobNumber, nowIso, uid, saveData, ymd } from "./storage";

const STATUS: JobStatus[] = ["Lead", "Scheduled", "Active", "Drying", "Rebuild", "On Hold", "Closed"];
const LOSS: LossType[] = ["Water", "Sewer", "Mould", "Fire", "Impact", "Other"];

const XACT_CATEGORIES: { code: XactCategory; label: string }[] = [
  { code: "WTR", label: "WTR – Water Mitigation" },
  { code: "CLN", label: "CLN – Contents / Cleaning" },
  { code: "DMO", label: "DMO – Demolition" },
  { code: "DRY", label: "DRY – Drywall / Insulation" },
  { code: "PNT", label: "PNT – Painting" },
  { code: "FLR", label: "FLR – Flooring" },
  { code: "CAB", label: "CAB – Cabinets / Counters" },
  { code: "PLM", label: "PLM – Plumbing" },
  { code: "ELC", label: "ELC – Electrical" },
  { code: "HVAC", label: "HVAC – HVAC" },
  { code: "TRM", label: "TRM – Trim / Finish" },
  { code: "ROF", label: "ROF – Roofing" },
  { code: "GLZ", label: "GLZ – Glazing" },
  { code: "RFG", label: "RFG – Appliances" },
  { code: "GEN", label: "GEN – General" },
];

function money(n: number) {
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "CAD" });
}

function lineTotal(l: EstimateLine) {
  const qty = Number(l.qty) || 0;
  const unit = Number(l.unitPrice) || 0;
  return qty * unit;
}

function jobTotals(job: Job) {
  const subtotal = job.estimate.lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const gst = subtotal * (job.estimate.gstRate ?? 0.05);
  const total = subtotal + gst;
  return { subtotal, gst, total };
}

function priorityBadge(p: Job["priority"]) {
  if (p === "High") return "badge high";
  if (p === "Medium") return "badge med";
  return "badge low";
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"Overview" | "Field" | "Docs" | "Estimate">("Overview");

  useEffect(() => {
    saveData(data);
  }, [data]);

  const jobs = data.jobs;

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === data.selectedJobId),
    [jobs, data.selectedJobId]
  );

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [
        j.id,
        j.clientName,
        j.siteAddress,
        j.claimNumber ?? "",
        j.lossType,
        j.status,
        j.priority,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [jobs, query]);

  const kpi = useMemo(() => {
    const open = jobs.filter((j) => j.status !== "Closed").length;
    const active = jobs.filter((j) => ["Active", "Drying", "Rebuild"].includes(j.status)).length;
    const drying = jobs.filter((j) => j.status === "Drying").length;
    const high = jobs.filter((j) => j.priority === "High" && j.status !== "Closed").length;
    return { open, active, drying, high };
  }, [jobs]);

  function upsertJob(next: Job) {
    setData((prev) => {
      const exists = prev.jobs.some((j) => j.id === next.id);
      const jobsNext = exists ? prev.jobs.map((j) => (j.id === next.id ? next : j)) : [next, ...prev.jobs];
      return { ...prev, jobs: jobsNext, selectedJobId: next.id };
    });
  }

  function deleteJob(id: string) {
    setData((prev) => {
      const nextJobs = prev.jobs.filter((j) => j.id !== id);
      const nextSelected = prev.selectedJobId === id ? undefined : prev.selectedJobId;
      return { ...prev, jobs: nextJobs, selectedJobId: nextSelected };
    });
  }

  function createJob(form: Partial<Job>) {
    const dateStr = ymd(new Date());
    const id = makeJobNumber(jobs, dateStr);
    const base: Job = {
      id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      status: "Lead",
      priority: "Medium",
      lossType: "Water",
      clientName: form.clientName ?? "Private",
      siteAddress: form.siteAddress ?? "Calgary, AB",
      claimNumber: form.claimNumber,
      adjusterName: form.adjusterName,
      adjusterPhone: form.adjusterPhone,
      adjusterEmail: form.adjusterEmail,
      primaryContactName: form.primaryContactName,
      primaryContactPhone: form.primaryContactPhone,
      primaryContactEmail: form.primaryContactEmail,
      summary: form.summary,
      notes: form.notes,
      moistureReadings: [],
      equipment: [],
      estimate: {
        lines: [],
        gstRate: 0.05,
        overheadPct: 0,
        profitPct: 0,
      },
    };
    upsertJob(base);
    setActiveTab("Overview");
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1 className="h1">RestorationOps</h1>
          <div className="sub">
            Integrated restoration ops: intake → drying logs → docs → Xact-style estimate → CO/invoice (next).
          </div>
        </div>

        <div className="row" style={{ alignItems: "center" }}>
          <input
            className="input"
            style={{ minWidth: 280 }}
            placeholder="Search jobs, claims, addresses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <NewJobModal onCreate={createJob} />
        </div>
      </div>

      <div className="grid cols-3" style={{ marginTop: 12 }}>
        <Kpi title="Open Jobs" value={kpi.open} />
        <Kpi title="Active" value={kpi.active} />
        <Kpi title="Drying" value={kpi.drying} />
      </div>

      <div className="grid cols-2" style={{ marginTop: 12 }}>
        {/* LEFT: Job list */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800 }}>Job Board</div>
            <div className="small">High priority: {kpi.high}</div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {filteredJobs.length === 0 ? (
              <div className="small">No jobs found.</div>
            ) : (
              filteredJobs.map((j) => (
                <button
                  key={j.id}
                  className="card"
                  style={{
                    padding: 12,
                    textAlign: "left",
                    cursor: "pointer",
                    border:
                      data.selectedJobId === j.id
                        ? "2px solid rgba(17,24,39,0.35)"
                        : "1px solid rgba(17,24,39,0.08)",
                  }}
                  onClick={() => {
                    setData((prev) => ({ ...prev, selectedJobId: j.id }));
                    setActiveTab("Overview");
                  }}
                >
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 800 }}>{j.id}</div>
                    <span className={priorityBadge(j.priority)}>{j.priority}</span>
                  </div>

                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className="badge">{j.status}</span>
                    <span className="badge">{j.lossType}</span>
                    {j.claimNumber ? <span className="badge">Claim: {j.claimNumber}</span> : null}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700 }}>{j.clientName}</div>
                    <div className="small">{j.siteAddress}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Job detail */}
        <div className="card" style={{ padding: 14 }}>
          {!selectedJob ? (
            <div className="small">Select a job to view details, or create a new one.</div>
          ) : (
            <JobDetail
              job={selectedJob}
              onChange={(next) => upsertJob(next)}
              onDelete={() => deleteJob(selectedJob.id)}
              tab={activeTab}
              setTab={setActiveTab}
            />
          )}
        </div>
      </div>

      <div className="small" style={{ marginTop: 12 }}>
        Data is stored locally in this browser for now. Next step: add database + users + permissions.
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="small" style={{ fontWeight: 700 }}>
        {title}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function JobDetail({
  job,
  onChange,
  onDelete,
  tab,
  setTab,
}: {
  job: Job;
  onChange: (next: Job) => void;
  onDelete: () => void;
  tab: "Overview" | "Field" | "Docs" | "Estimate";
  setTab: (t: "Overview" | "Field" | "Docs" | "Estimate") => void;
}) {
  const totals = jobTotals(job);

  function patch(p: Partial<Job>) {
    onChange({ ...job, ...p, updatedAt: nowIso() });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{job.id}</div>
          <div className="small">Created: {new Date(job.createdAt).toLocaleString()}</div>
          <div className="small">Updated: {new Date(job.updatedAt).toLocaleString()}</div>
        </div>

        <div className="row" style={{ alignItems: "center", justifyContent: "flex-end" }}>
          <button className="btn secondary" onClick={onDelete} title="Deletes this job from local storage">
            Delete
          </button>
        </div>
      </div>

      <div className="grid cols-3">
        <div>
          <div className="small" style={{ fontWeight: 700 }}>
            Status
          </div>
          <select
            className="input"
            value={job.status}
            onChange={(e) => patch({ status: e.target.value as JobStatus })}
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="small" style={{ fontWeight: 700 }}>
            Priority
          </div>
          <select
            className="input"
            value={job.priority}
            onChange={(e) => patch({ priority: e.target.value as Job["priority"] })}
          >
            {["Low", "Medium", "High"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="small" style={{ fontWeight: 700 }}>
            Loss Type
          </div>
          <select
            className="input"
            value={job.lossType}
            onChange={(e) => patch({ lossType: e.target.value as LossType })}
          >
            {LOSS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tabs">
        {(["Overview", "Field", "Docs", "Estimate"] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <OverviewTab job={job} onChange={onChange} />
      ) : tab === "Field" ? (
        <FieldTab job={job} onChange={onChange} />
      ) : tab === "Docs" ? (
        <DocsTab />
      ) : (
        <EstimateTab job={job} onChange={onChange} />
      )}

      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Estimate Totals</div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="small">Subtotal</div>
          <div style={{ fontWeight: 800 }}>{money(totals.subtotal)}</div>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="small">GST ({Math.round((job.estimate.gstRate ?? 0.05) * 100)}%)</div>
          <div style={{ fontWeight: 800 }}>{money(totals.gst)}</div>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="small">Total</div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{money(totals.total)}</div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ job, onChange }: { job: Job; onChange: (next: Job) => void }) {
  function patch(p: Partial<Job>) {
    onChange({ ...job, ...p, updatedAt: nowIso() });
  }

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Intake</div>

      <div className="grid cols-2">
        <div>
          <div className="small" style={{ fontWeight: 700 }}>Client</div>
          <input className="input" value={job.clientName} onChange={(e) => patch({ clientName: e.target.value })} />
        </div>

        <div>
          <div className="small" style={{ fontWeight: 700 }}>Site Address</div>
          <input className="input" value={job.siteAddress} onChange={(e) => patch({ siteAddress: e.target.value })} />
        </div>

        <div>
          <div className="small" style={{ fontWeight: 700 }}>Claim #</div>
          <input className="input" value={job.claimNumber ?? ""} onChange={(e) => patch({ claimNumber: e.target.value })} />
        </div>

        <div>
          <div className="small" style={{ fontWeight: 700 }}>Adjuster</div>
          <input className="input" value={job.adjusterName ?? ""} onChange={(e) => patch({ adjusterName: e.target.value })} />
        </div>

        <div>
          <div className="small" style={{ fontWeight: 700 }}>Adjuster Phone</div>
          <input className="input" value={job.adjusterPhone ?? ""} onChange={(e) => patch({ adjusterPhone: e.target.value })} />
        </div>

        <div>
          <div className="small" style={{ fontWeight: 700 }}>Adjuster Email</div>
          <input className="input" value={job.adjusterEmail ?? ""} onChange={(e) => patch({ adjusterEmail: e.target.value })} />
        </div>

        <div>
          <div className="small" style={{ fontWeight: 700 }}>Primary Contact</div>
          <input className="input" value={job.primaryContactName ?? ""} onChange={(e) => patch({ primaryContactName: e.target.value })} />
        </div>

        <div>
          <div className="small" style={{ fontWeight: 700 }}>Contact Phone</div>
          <input className="input" value={job.primaryContactPhone ?? ""} onChange={(e) => patch({ primaryContactPhone: e.target.value })} />
        </div>

        <div>
          <div className="small" style={{ fontWeight: 700 }}>Contact Email</div>
          <input className="input" value={job.primaryContactEmail ?? ""} onChange={(e) => patch({ primaryContactEmail: e.target.value })} />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="small" style={{ fontWeight: 700 }}>Summary</div>
        <textarea className="input" value={job.summary ?? ""} onChange={(e) => patch({ summary: e.target.value })} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="small" style={{ fontWeight: 700 }}>Notes</div>
        <textarea className="input" value={job.notes ?? ""} onChange={(e) => patch({ notes: e.target.value })} />
      </div>
    </div>
  );
}

function FieldTab({ job, onChange }: { job: Job; onChange: (next: Job) => void }) {
  function patch(next: Partial<Job>) {
    onChange({ ...job, ...next, updatedAt: nowIso() });
  }

  function addMoisture() {
    const r: FieldMoistureReading = {
      id: uid("m"),
      date: ymd(new Date()),
      area: "",
      material: "",
      reading: 0,
      target: undefined,
      notes: "",
    };
    patch({ moistureReadings: [r, ...job.moistureReadings] });
  }

  function updateMoisture(id: string, p: Partial<FieldMoistureReading>) {
    patch({
      moistureReadings: job.moistureReadings.map((r) => (r.id === id ? { ...r, ...p } : r)),
    });
  }

  function removeMoisture(id: string) {
    patch({ moistureReadings: job.moistureReadings.filter((r) => r.id !== id) });
  }

  function addEquip() {
    const e: EquipmentItem = {
      id: uid("e"),
      type: "Dehu",
      serial: "",
      location: "",
      startDate: ymd(new Date()),
      endDate: "",
      billableDays: undefined,
      notes: "",
    };
    patch({ equipment: [e, ...job.equipment] });
  }

  function updateEquip(id: string, p: Partial<EquipmentItem>) {
    patch({
      equipment: job.equipment.map((e) => (e.id === id ? { ...e, ...p } : e)),
    });
  }

  function removeEquip(id: string) {
    patch({ equipment: job.equipment.filter((e) => e.id !== id) });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Moisture Readings</div>
          <button className="btn" onClick={addMoisture}>Add Reading</button>
        </div>

        {job.moistureReadings.length === 0 ? (
          <div className="small" style={{ marginTop: 8 }}>No readings yet.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {job.moistureReadings.map((r) => (
              <div key={r.id} className="card" style={{ padding: 10, border: "1px solid rgba(17,24,39,0.08)", boxShadow: "none" }}>
                <div className="grid cols-3">
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Date</div>
                    <input className="input" value={r.date} onChange={(e) => updateMoisture(r.id, { date: e.target.value })} />
                  </div>
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Area</div>
                    <input className="input" value={r.area} onChange={(e) => updateMoisture(r.id, { area: e.target.value })} placeholder="Kitchen wall, Hallway, Bedroom 2..." />
                  </div>
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Material</div>
                    <input className="input" value={r.material} onChange={(e) => updateMoisture(r.id, { material: e.target.value })} placeholder="Drywall, Stud, Subfloor..." />
                  </div>
                </div>

                <div className="grid cols-3" style={{ marginTop: 8 }}>
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Reading</div>
                    <input
                      className="input"
                      type="number"
                      value={r.reading}
                      onChange={(e) => updateMoisture(r.id, { reading: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Target (optional)</div>
                    <input
                      className="input"
                      type="number"
                      value={r.target ?? ""}
                      onChange={(e) => updateMoisture(r.id, { target: e.target.value === "" ? undefined : Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                    <button className="btn secondary" onClick={() => removeMoisture(r.id)}>Remove</button>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div className="small" style={{ fontWeight: 700 }}>Notes</div>
                  <input className="input" value={r.notes ?? ""} onChange={(e) => updateMoisture(r.id, { notes: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Equipment</div>
          <button className="btn" onClick={addEquip}>Add Equipment</button>
        </div>

        {job.equipment.length === 0 ? (
          <div className="small" style={{ marginTop: 8 }}>No equipment logged yet.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {job.equipment.map((e) => (
              <div key={e.id} className="card" style={{ padding: 10, border: "1px solid rgba(17,24,39,0.08)", boxShadow: "none" }}>
                <div className="grid cols-3">
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Type</div>
                    <select className="input" value={e.type} onChange={(ev) => updateEquip(e.id, { type: ev.target.value as EquipmentItem["type"] })}>
                      {["Dehu", "Fan", "Air Scrubber", "Heater", "Other"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Serial (optional)</div>
                    <input className="input" value={e.serial ?? ""} onChange={(ev) => updateEquip(e.id, { serial: ev.target.value })} />
                  </div>
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Location</div>
                    <input className="input" value={e.location} onChange={(ev) => updateEquip(e.id, { location: ev.target.value })} placeholder="Living room, Hallway..." />
                  </div>
                </div>

                <div className="grid cols-3" style={{ marginTop: 8 }}>
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Start Date</div>
                    <input className="input" value={e.startDate} onChange={(ev) => updateEquip(e.id, { startDate: ev.target.value })} />
                  </div>
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>End Date (optional)</div>
                    <input className="input" value={e.endDate ?? ""} onChange={(ev) => updateEquip(e.id, { endDate: ev.target.value })} />
                  </div>
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Billable Days (optional)</div>
                    <input
                      className="input"
                      type="number"
                      value={e.billableDays ?? ""}
                      onChange={(ev) => updateEquip(e.id, { billableDays: ev.target.value === "" ? undefined : Number(ev.target.value) })}
                      placeholder="Auto later"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 8 }} className="grid cols-2">
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>Notes</div>
                    <input className="input" value={e.notes ?? ""} onChange={(ev) => updateEquip(e.id, { notes: ev.target.value })} />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                    <button className="btn secondary" onClick={() => removeEquip(e.id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocsTab() {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Docs (Next)</div>
      <div className="small">
        Next we’ll add:
        <ul>
          <li>Work Authorization + digital signature</li>
          <li>Daily Drying Report PDF (moisture + equipment + notes)</li>
          <li>Photo report + attachment uploads</li>
          <li>IAQ / clearance uploads</li>
        </ul>
      </div>
    </div>
  );
}

function EstimateTab({ job, onChange }: { job: Job; onChange: (next: Job) => void }) {
  function patchLines(lines: EstimateLine[]) {
    onChange({ ...job, updatedAt: nowIso(), estimate: { ...job.estimate, lines } });
  }

  function addLine() {
    const l: EstimateLine = {
      id: uid("l"),
      category: "WTR",
      description: "",
      qty: 1,
      unit: "ea",
      unitPrice: 0,
      notes: "",
    };
    patchLines([l, ...job.estimate.lines]);
  }

  function updateLine(id: string, p: Partial<EstimateLine>) {
    patchLines(job.estimate.lines.map((l) => (l.id === id ? { ...l, ...p } : l)));
  }

  function removeLine(id: string) {
    patchLines(job.estimate.lines.filter((l) => l.id !== id));
  }

  const grouped = useMemo(() => {
    const map = new Map<XactCategory, EstimateLine[]>();
    for (const l of job.estimate.lines) {
      const arr = map.get(l.category) ?? [];
      arr.push(l);
      map.set(l.category, arr);
    }
    return map;
  }, [job.estimate.lines]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Xactimate-style Estimate</div>
          <button className="btn" onClick={addLine}>Add Line Item</button>
        </div>

        {job.estimate.lines.length === 0 ? (
          <div className="small" style={{ marginTop: 8 }}>No estimate lines yet.</div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
            {XACT_CATEGORIES.map((cat) => {
              const lines = grouped.get(cat.code) ?? [];
              if (lines.length === 0) return null;

              const catSubtotal = lines.reduce((s, l) => s + lineTotal(l), 0);

              return (
                <div key={cat.code} className="card" style={{ padding: 10, border: "1px solid rgba(17,24,39,0.08)", boxShadow: "none" }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{cat.label}</div>
                    <div style={{ fontWeight: 900 }}>{money(catSubtotal)}</div>
                  </div>

                  <div style={{ overflowX: "auto", marginTop: 10 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: 120 }}>Category</th>
                          <th>Description</th>
                          <th style={{ width: 80 }}>Qty</th>
                          <th style={{ width: 90 }}>Unit</th>
                          <th style={{ width: 120 }} className="num">Unit Price</th>
                          <th style={{ width: 120 }} className="num">Line Total</th>
                          <th style={{ width: 90 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l) => (
                          <tr key={l.id}>
                            <td>
                              <select
                                className="input"
                                value={l.category}
                                onChange={(e) => updateLine(l.id, { category: e.target.value as XactCategory })}
                              >
                                {XACT_CATEGORIES.map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                className="input"
                                value={l.description}
                                onChange={(e) => updateLine(l.id, { description: e.target.value })}
                                placeholder="e.g., Remove wet drywall 2' flood cut, set dehu, HEPA vac, etc."
                              />
                              <div style={{ marginTop: 6 }}>
                                <input
                                  className="input"
                                  value={l.notes ?? ""}
                                  onChange={(e) => updateLine(l.id, { notes: e.target.value })}
                                  placeholder="Notes (optional)"
                                />
                              </div>
                            </td>
                            <td>
                              <input
                                className="input"
                                type="number"
                                value={l.qty}
                                onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })}
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                value={l.unit}
                                onChange={(e) => updateLine(l.id, { unit: e.target.value })}
                              />
                            </td>
                            <td className="num">
                              <input
                                className="input"
                                type="number"
                                value={l.unitPrice}
                                onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) })}
                              />
                            </td>
                            <td className="num" style={{ fontWeight: 800 }}>
                              {money(lineTotal(l))}
                            </td>
                            <td>
                              <button className="btn secondary" onClick={() => removeLine(l.id)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Settings</div>
        <div className="grid cols-3">
          <div>
            <div className="small" style={{ fontWeight: 700 }}>GST Rate</div>
            <input
              className="input"
              type="number"
              step="0.01"
              value={job.estimate.gstRate}
              onChange={(e) =>
                onChange({
                  ...job,
                  updatedAt: nowIso(),
                  estimate: { ...job.estimate, gstRate: Number(e.target.value) },
                })
              }
            />
            <div className="small">Use 0.05 for 5%.</div>
          </div>
          <div>
            <div className="small" style={{ fontWeight: 700 }}>Overhead % (later)</div>
            <input
              className="input"
              type="number"
              value={job.estimate.overheadPct}
              onChange={(e) =>
                onChange({
                  ...job,
                  updatedAt: nowIso(),
                  estimate: { ...job.estimate, overheadPct: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <div className="small" style={{ fontWeight: 700 }}>Profit % (later)</div>
            <input
              className="input"
              type="number"
              value={job.estimate.profitPct}
              onChange={(e) =>
                onChange({
                  ...job,
                  updatedAt: nowIso(),
                  estimate: { ...job.estimate, profitPct: Number(e.target.value) },
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NewJobModal({ onCreate }: { onCreate: (form: Partial<Job>) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    siteAddress: "",
    claimNumber: "",
    adjusterName: "",
    adjusterPhone: "",
    adjusterEmail: "",
    primaryContactName: "",
    primaryContactPhone: "",
    primaryContactEmail: "",
    summary: "",
    notes: "",
  });

  function close() {
    setOpen(false);
  }

  function create() {
    onCreate({
      clientName: form.clientName || "Private",
      siteAddress: form.siteAddress || "Calgary, AB",
      claimNumber: form.claimNumber || undefined,
      adjusterName: form.adjusterName || undefined,
      adjusterPhone: form.adjusterPhone || undefined,
      adjusterEmail: form.adjusterEmail || undefined,
      primaryContactName: form.primaryContactName || undefined,
      primaryContactPhone: form.primaryContactPhone || undefined,
      primaryContactEmail: form.primaryContactEmail || undefined,
      summary: form.summary || undefined,
      notes: form.notes || undefined,
    });

    setForm({
      clientName: "",
      siteAddress: "",
      claimNumber: "",
      adjusterName: "",
      adjusterPhone: "",
      adjusterEmail: "",
      primaryContactName: "",
      primaryContactPhone: "",
      primaryContactEmail: "",
      summary: "",
      notes: "",
    });
    close();
  }

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>
        New Job
      </button>

      {open ? (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(820px, 100%)", padding: 14 }}
          >
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Create Job</div>
              <button className="btn secondary" onClick={close}>
                Close
              </button>
            </div>

            <div className="small" style={{ marginTop: 6 }}>
              Job number auto-generates like <b>{ymd(new Date())}-001</b> and increments per day.
            </div>

            <div className="grid cols-2" style={{ marginTop: 12 }}>
              <div>
                <div className="small" style={{ fontWeight: 700 }}>Client</div>
                <input className="input" value={form.clientName} onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))} />
              </div>
              <div>
                <div className="small" style={{ fontWeight: 700 }}>Site Address</div>
                <input className="input" value={form.siteAddress} onChange={(e) => setForm((p) => ({ ...p, siteAddress: e.target.value }))} />
              </div>

              <div>
                <div className="small" style={{ fontWeight: 700 }}>Claim #</div>
                <input className="input" value={form.claimNumber} onChange={(e) => setForm((p) => ({ ...p, claimNumber: e.target.value }))} />
              </div>
              <div>
                <div className="small" style={{ fontWeight: 700 }}>Adjuster Name</div>
                <input className="input" value={form.adjusterName} onChange={(e) => setForm((p) => ({ ...p, adjusterName: e.target.value }))} />
              </div>

              <div>
                <div className="small" style={{ fontWeight: 700 }}>Adjuster Phone</div>
                <input className="input" value={form.adjusterPhone} onChange={(e) => setForm((p) => ({ ...p, adjusterPhone: e.target.value }))} />
              </div>
              <div>
                <div className="small" style={{ fontWeight: 700 }}>Adjuster Email</div>
                <input className="input" value={form.adjusterEmail} onChange={(e) => setForm((p) => ({ ...p, adjusterEmail: e.target.value }))} />
              </div>

              <div>
                <div className="small" style={{ fontWeight: 700 }}>Primary Contact</div>
                <input className="input" value={form.primaryContactName} onChange={(e) => setForm((p) => ({ ...p, primaryContactName: e.target.value }))} />
              </div>
              <div>
                <div className="small" style={{ fontWeight: 700 }}>Contact Phone</div>
                <input className="input" value={form.primaryContactPhone} onChange={(e) => setForm((p) => ({ ...p, primaryContactPhone: e.target.value }))} />
              </div>

              <div>
                <div className="small" style={{ fontWeight: 700 }}>Contact Email</div>
                <input className="input" value={form.primaryContactEmail} onChange={(e) => setForm((p) => ({ ...p, primaryContactEmail: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="small" style={{ fontWeight: 700 }}>Summary</div>
              <textarea className="input" value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="small" style={{ fontWeight: 700 }}>Notes</div>
              <textarea className="input" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn secondary" onClick={close}>Cancel</button>
              <button className="btn" onClick={create}>Create Job</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}