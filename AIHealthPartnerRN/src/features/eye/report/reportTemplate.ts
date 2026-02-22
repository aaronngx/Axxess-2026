// src/features/eye/report/reportTemplate.ts
// HTML template for PDF export. Renders the full vision session report.

import { EyeSessionResult, EyeCombinedResult } from '../models/types';

function fmtD(v: number | null): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)} D`;
}

function fmtPct(v: number | null): string {
  return v != null ? `${Math.round(v * 100)}%` : '—';
}

function eyeRow(e: EyeCombinedResult): string {
  const conf = Math.round(e.confidence_0to1 * 100);
  return `
    <tr>
      <td>${e.eye === 'right' ? 'Right (OD)' : 'Left (OS)'}</td>
      <td>${fmtD(e.sphere_d)}</td>
      <td>${fmtD(e.cylinder_d)}</td>
      <td>${e.axis_deg != null ? e.axis_deg + '°' : '—'}</td>
      <td>${fmtD(e.ser_d)}</td>
      <td>${e.far_va_proxy != null ? e.far_va_proxy.toFixed(2) + ' logMAR' : '—'}</td>
      <td>${conf}%</td>
    </tr>`;
}

function qualityColor(label: string): string {
  if (label === 'High') return '#27ae60';
  if (label === 'Medium') return '#f39c12';
  return '#e74c3c';
}

export function buildReportHTML(
  session: EyeSessionResult,
  aiSummary?: string,
  aiSteps?: string[],
): string {
  const q = session.quality;
  const f = session.functional;
  const va = session.vision_age;
  const date = new Date(session.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const ageRow = (label: string, range: [number, number] | null) =>
    `<tr><td>${label}</td><td>${range ? `${range[0]}–${range[1]} yrs` : '—'}</td></tr>`;

  const summaryText = aiSummary ?? 'This is a screening-grade estimate. Results should be verified by a licensed optometrist.';
  const stepsList = (aiSteps ?? [
    'Schedule an optometrist appointment for a full examination.',
    'Retest in 4–8 weeks to track changes over time.',
  ]).map(s => `<li>${s}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vision Screening Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #222; background: #fff; padding: 32px; }
  h1 { font-size: 24px; color: #2c3e50; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #888; margin-bottom: 24px; }
  .disclaimer { background: #fff3cd; border-left: 4px solid #f39c12; padding: 10px 14px; font-size: 12px; color: #856404; margin-bottom: 24px; border-radius: 4px; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 15px; font-weight: 700; color: #34495e; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f8f9fa; font-weight: 600; text-align: left; padding: 8px 10px; border: 1px solid #dee2e6; }
  td { padding: 8px 10px; border: 1px solid #dee2e6; }
  tr:nth-child(even) td { background: #f8f9fa; }
  .quality-badge { display: inline-block; background: ${qualityColor(q.quality_label)}22; color: ${qualityColor(q.quality_label)}; border: 1.5px solid ${qualityColor(q.quality_label)}; border-radius: 20px; padding: 4px 14px; font-weight: 700; font-size: 14px; }
  .quality-row { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
  .quality-conf { font-size: 13px; color: #555; }
  .reason-list { font-size: 12px; color: #666; margin-top: 6px; }
  .kv { display: flex; gap: 8px; flex-wrap: wrap; }
  .kv-item { background: #f8f9fa; border-radius: 8px; padding: 8px 14px; font-size: 12px; min-width: 120px; }
  .kv-item .label { color: #888; font-size: 11px; text-transform: uppercase; }
  .kv-item .value { font-size: 16px; font-weight: 700; color: #2c3e50; }
  .summary-box { background: #f0f4ff; border-left: 4px solid #6C5CE7; padding: 12px 16px; border-radius: 4px; font-size: 13px; line-height: 1.6; }
  .steps-list { font-size: 13px; line-height: 1.8; padding-left: 20px; color: #444; }
  .footer { margin-top: 32px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
  .age-ok { color: #27ae60; }
  .age-warn { color: #e67e22; }
</style>
</head>
<body>

<h1>👁 Vision Screening Report</h1>
<p class="subtitle">${date} &nbsp;·&nbsp; Session: ${session.session_id} &nbsp;·&nbsp; Device: ${session.device_model}</p>

<div class="disclaimer">
  ⚠️ <strong>Screening only.</strong> These are computer-assisted screening-grade estimates, not a guaranteed eyeglass prescription or medical diagnosis. Always consult a licensed optometrist for clinical evaluation.
</div>

<!-- Test Quality -->
<div class="section">
  <h2>Test Quality</h2>
  <div class="quality-row">
    <span class="quality-badge">${q.quality_label}</span>
    <span class="quality-conf">Confidence: ${q.confidence_0to100}/100</span>
    <span class="quality-conf">Repeatability: ${q.repeatability_ok ? '✓ OK' : '⚠ Poor'}</span>
  </div>
  ${q.reasons.length > 0
    ? `<div class="reason-list">Reasons: ${q.reasons.join(' · ')}</div>`
    : ''}
</div>

<!-- Per-Eye Results -->
<div class="section">
  <h2>Per-Eye Refraction Estimates</h2>
  <table>
    <tr>
      <th>Eye</th><th>Sphere (S)</th><th>Cylinder (C)</th><th>Axis</th>
      <th>SER</th><th>Far VA Proxy</th><th>Confidence</th>
    </tr>
    ${session.per_eye.map(eyeRow).join('')}
  </table>
</div>

<!-- Functional Vision -->
<div class="section">
  <h2>Functional Vision</h2>
  <div class="kv">
    <div class="kv-item"><div class="label">Reading Dist.</div><div class="value">${f.preferred_reading_distance_cm != null ? f.preferred_reading_distance_cm + ' cm' : '—'}</div></div>
    <div class="kv-item"><div class="label">Contrast Score</div><div class="value">${fmtPct(f.contrast_score)}</div></div>
    <div class="kv-item"><div class="label">Low-Light</div><div class="value">${fmtPct(f.low_light_score)}</div></div>
    <div class="kv-item"><div class="label">Mesopic Penalty</div><div class="value">${fmtPct(f.mesopic_penalty)}</div></div>
    <div class="kv-item"><div class="label">Eye Strain</div><div class="value">${f.strain_score_0to10 != null ? f.strain_score_0to10 + '/10' : '—'}</div></div>
    <div class="kv-item"><div class="label">Blur</div><div class="value">${f.blur_score_0to10 != null ? f.blur_score_0to10 + '/10' : '—'}</div></div>
    <div class="kv-item"><div class="label">PD</div><div class="value">${session.pd_mm != null ? session.pd_mm + ' mm' : '—'}</div></div>
  </div>
</div>

<!-- Vision Age -->
${va ? `
<div class="section">
  <h2>Vision Age (Functional Index)</h2>
  <table>
    ${ageRow('Distance Clarity', va.distance_age_range)}
    ${ageRow('Near Focus', va.near_age_range)}
    ${ageRow('Contrast Sensitivity', va.contrast_age_range)}
    ${ageRow('Low-Light Adaptation', va.low_light_age_range)}
    <tr style="font-weight:700"><td>Overall Vision Age</td><td>${va.overall_age_range ? va.overall_age_range[0] + '–' + va.overall_age_range[1] + ' yrs' : '—'}</td></tr>
  </table>
  <p style="font-size:11px;color:#888;margin-top:6px">Functional age index for self-tracking only. Not a medical assessment.</p>
</div>` : ''}

<!-- Summary -->
<div class="section">
  <h2>Summary &amp; Next Steps</h2>
  <div class="summary-box">${summaryText}</div>
  ${stepsList ? `<ul class="steps-list" style="margin-top:12px">${stepsList}</ul>` : ''}
</div>

<div class="footer">
  Generated by AI Health Partner &nbsp;·&nbsp; v${session.app_version} &nbsp;·&nbsp;
  This report does not constitute medical advice. For clinical assessment, please visit an optometrist.
</div>

</body>
</html>`;
}
