export type JobStatus =
  | "Lead"
  | "Scheduled"
  | "Active"
  | "Drying"
  | "Rebuild"
  | "Closed"
  | "On Hold";

export type LossType = "Water" | "Sewer" | "Mould" | "Fire" | "Impact" | "Other";

export type XactCategory =
  | "WTR" // Water Mitigation
  | "CLN" // Contents / Cleaning
  | "DMO" // Demolition
  | "DRY" // Drywall / Insulation
  | "PNT" // Painting
  | "FLR" // Flooring
  | "CAB" // Cabinets / Counters
  | "PLM" // Plumbing
  | "ELC" // Electrical
  | "HVAC"
  | "TRM" // Trim / Finish carpentry
  | "ROF"
  | "GLZ"
  | "RFG" // Refrigeration / Appliances
  | "GEN"; // General / Other

export type EstimateLine = {
  id: string;
  category: XactCategory;
  description: string;
  qty: number;
  unit: string; // ea, sf, lf, hr, day, etc
  unitPrice: number;
  notes?: string;
};

export type FieldMoistureReading = {
  id: string;
  date: string; // YYYY-MM-DD
  area: string; // Room/Location
  material: string; // drywall, stud, subfloor
  reading: number; // meter value
  target?: number; // optional target
  notes?: string;
};

export type EquipmentItem = {
  id: string;
  type: "Dehu" | "Fan" | "Air Scrubber" | "Heater" | "Other";
  serial?: string;
  location: string; // where placed
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  billableDays?: number; // optional override
  notes?: string;
};

export type Job = {
  id: string; // job number e.g. 2026-02-11-001
  createdAt: string; // ISO
  updatedAt: string; // ISO

  status: JobStatus;
  priority: "Low" | "Medium" | "High";
  lossType: LossType;

  clientName: string;
  siteAddress: string;

  claimNumber?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;

  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;

  summary?: string; // what happened
  notes?: string; // general notes

  moistureReadings: FieldMoistureReading[];
  equipment: EquipmentItem[];
  estimate: {
    lines: EstimateLine[];
    gstRate: number; // 0.05 default
    overheadPct: number; // optional for later
    profitPct: number; // optional for later
  };
};

export type AppData = {
  jobs: Job[];
  selectedJobId?: string;
};