import jsPDF from "jspdf";
import type { Job } from "./types";

function money(n: number) {
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "CAD" });
}

function safe(s?: string) {
  return (s ?? "").toString().trim();
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function drawRow(
  doc: jsPDF,
  cols: { text: string; width: number; align?: "left" | "right" }[],
  x: number,
  y: number,
  rowH: number
) {
  let cx = x;
  doc.setDrawColor(220);
  doc.setLineWidth(0.2);
  doc.rect(x, y, cols.reduce((s, c) => s + c.width, 0), rowH);

  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    doc.rect(cx, y, c.width, rowH);

    const pad = 2.2;
    const tx = c.align === "right" ? cx + c.width - pad : cx + pad;
    doc.text(c.text, tx, y + rowH / 2 + 1.2, { align: c.align ?? "left", baseline: "middle" });

    cx += c.width;
  }
}

function ensurePage(doc: jsPDF, y: number, needed: number, bottom = 18) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - bottom) {
    doc.addPage();
    return 18;
  }
  return y;
}

export function downloadDailyDryingReport(job: Job) {
  // US Letter portrait
  const doc = new jsPDF({ unit: "mm", format: "letter" });

  const pageW = doc.internal.pageSize.getWidth();
  const left = 16;
  const right = 16;
  const maxW = pageW - left - right;

  let y = 16;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Daily Drying Report", left, y);
  y += 7;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Job #: ${job.id}`, left, y);
  y += 5;
  doc.text(`Client: ${safe(job.clientName)}`, left, y);
  y += 5;
  doc.text(`Site: ${safe(job.siteAddress)}`, left, y);
  y += 5;

  const claim = safe(job.claimNumber);
  if (claim) {
    doc.text(`Claim #: ${claim}`, left, y);
    y += 5;
  }

  doc.text(`Loss Type: ${job.lossType}   |   Status: ${job.status}   |   Priority: ${job.priority}`, left, y);
  y += 6;

  doc.setDrawColor(200);
  doc.line(left, y, left + maxW, y);
  y += 6;

  // Summary / Notes
  const summary = safe(job.summary);
  const notes = safe(job.notes);

  if (summary) {
    doc.setFont("helvetica", "bold");
    doc.text("Summary", left, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, summary, left, y, maxW, 4.5);
    y += 4;
  }

  if (notes) {
    y = ensurePage(doc, y, 18);
    doc.setFont("helvetica", "bold");
    doc.text("General Notes", left, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, notes, left, y, maxW, 4.5);
    y += 4;
  }

  // Moisture Table
  y = ensurePage(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.text("Moisture Readings", left, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const colW = {
    date: 22,
    area: 46,
    mat: 34,
    reading: 18,
    target: 18,
    notes: maxW - (22 + 46 + 34 + 18 + 18),
  };

  // Header row
  drawRow(
    doc,
    [
      { text: "Date", width: colW.date },
      { text: "Area", width: colW.area },
      { text: "Material", width: colW.mat },
      { text: "Reading", width: colW.reading, align: "right" },
      { text: "Target", width: colW.target, align: "right" },
      { text: "Notes", width: colW.notes },
    ],
    left,
    y,
    7
  );
  y += 7;

  const readings = [...job.moistureReadings].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (readings.length === 0) {
    y = ensurePage(doc, y, 10);
    doc.text("No moisture readings recorded.", left, y + 5);
    y += 10;
  } else {
    for (const r of readings) {
      y = ensurePage(doc, y, 10);
      const rowH = 8;

      const notesTxt = safe(r.notes);
      const truncatedNotes = notesTxt.length > 55 ? notesTxt.slice(0, 55) + "…" : notesTxt;

      drawRow(
        doc,
        [
          { text: safe(r.date), width: colW.date },
          { text: safe(r.area), width: colW.area },
          { text: safe(r.material), width: colW.mat },
          { text: String(r.reading ?? ""), width: colW.reading, align: "right" },
          { text: r.target == null ? "" : String(r.target), width: colW.target, align: "right" },
          { text: truncatedNotes, width: colW.notes },
        ],
        left,
        y,
        rowH
      );
      y += rowH;
    }
    y += 4;
  }

  // Equipment Table
  y = ensurePage(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Equipment Log", left, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const eColW = {
    type: 22,
    serial: 26,
    loc: 54,
    start: 22,
    end: 22,
    days: 18,
    notes: maxW - (22 + 26 + 54 + 22 + 22 + 18),
  };

  drawRow(
    doc,
    [
      { text: "Type", width: eColW.type },
      { text: "Serial", width: eColW.serial },
      { text: "Location", width: eColW.loc },
      { text: "Start", width: eColW.start },
      { text: "End", width: eColW.end },
      { text: "Days", width: eColW.days, align: "right" },
      { text: "Notes", width: eColW.notes },
    ],
    left,
    y,
    7
  );
  y += 7;

  const equip = [...job.equipment].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  if (equip.length === 0) {
    y = ensurePage(doc, y, 10);
    doc.text("No equipment logged.", left, y + 5);
    y += 10;
  } else {
    for (const e of equip) {
      y = ensurePage(doc, y, 10);
      const rowH = 8;

      const notesTxt = safe(e.notes);
      const truncatedNotes = notesTxt.length > 45 ? notesTxt.slice(0, 45) + "…" : notesTxt;

      drawRow(
        doc,
        [
          { text: safe(e.type), width: eColW.type },
          { text: safe(e.serial), width: eColW.serial },
          { text: safe(e.location), width: eColW.loc },
          { text: safe(e.startDate), width: eColW.start },
          { text: safe(e.endDate), width: eColW.end },
          { text: e.billableDays == null ? "" : String(e.billableDays), width: eColW.days, align: "right" },
          { text: truncatedNotes, width: eColW.notes },
        ],
        left,
        y,
        rowH
      );
      y += rowH;
    }
    y += 4;
  }

  // Footer
  const generated = new Date().toLocaleString();
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`Generated: ${generated}`, left, doc.internal.pageSize.getHeight() - 12);
  doc.setTextColor(0);

  // Filename
  const fileSafeAddr = safe(job.siteAddress).replace(/[\\/:*?\"<>|]+/g, "-").slice(0, 60);
  const filename = `DailyDryingReport_${job.id}_${fileSafeAddr || "site"}.pdf`;

  doc.save(filename);
}