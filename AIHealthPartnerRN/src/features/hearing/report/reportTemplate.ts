// src/features/hearing/report/reportTemplate.ts
// Generates HTML for the hearing screening PDF report.

import { HearingSessionResult } from '../models/types';
import { nextStepLabel, urgencyLabel } from '../engine/safetyRules';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function severityColor(band: string): string {
  if (band === 'normal') return '#2ECC71';
  if (band === 'mild') return '#FDCB6E';
  if (band === 'moderate') return '#F39C12';
  if (band === 'moderately_severe') return '#E67E22';
  if (band === 'severe' || band === 'profound') return '#E74C3C';
  return '#888';
}

function confColor(conf: string): string {
  if (conf === 'High') return '#2ECC71';
  if (conf === 'Medium') return '#FDCB6E';
  return '#FF6B81';
}

export function buildHearingReportHTML(
  session: HearingSessionResult,
  aiSummary?: string,
  aiSteps?: string,
): string {
  const { pattern_flags: pf, symptoms: sym } = session;

  const patternList = [
    pf.high_frequency_loss && 'High-frequency loss pattern',
    pf.low_frequency_loss && 'Low-frequency loss pattern',
    pf.left_right_asymmetry && `Left-right asymmetry (${pf.asymmetry_severity})`,
    pf.speech_in_noise_difficulty && 'Speech-in-noise difficulty',
  ].filter(Boolean).join(', ') || 'None detected';

  const symptomList = [
    sym.sudden_change && 'Sudden change',
    sym.tinnitus && 'Tinnitus',
    sym.ear_pain && 'Ear pain',
    sym.dizziness && 'Dizziness',
    sym.one_ear_worse && 'One ear worse',
    sym.trouble_in_noise && 'Trouble in noise',
  ].filter(Boolean).join(', ') || 'None reported';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Hearing Function Screening Report</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 24px; color: #1a1a2e; background: #fff; }
  .header { text-align: center; border-bottom: 2px solid #6C5CE7; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #6C5CE7; margin: 0 0 4px; }
  .header p { font-size: 12px; color: #888; margin: 0; }
  .disclaimer { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px 14px; border-radius: 4px; margin-bottom: 18px; font-size: 12px; color: #856404; }
  .top-card { background: linear-gradient(135deg, #6C5CE7, #a29bfe); border-radius: 16px; padding: 24px; color: #fff; margin-bottom: 20px; text-align: center; }
  .top-card .age-label { font-size: 13px; opacity: 0.8; margin-bottom: 4px; }
  .top-card .age { font-size: 52px; font-weight: 900; margin: 0; }
  .top-card .age-unit { font-size: 16px; opacity: 0.8; }
  .badges { display: flex; gap: 8px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
  .badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.2); }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 14px; color: #6C5CE7; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  .kv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .kv-table td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
  .kv-table td:first-child { color: #666; width: 45%; }
  .kv-table td:last-child { font-weight: 600; }
  .red-flag-box { background: #fdecea; border-left: 4px solid #E74C3C; padding: 10px 14px; border-radius: 4px; margin-bottom: 12px; font-size: 12px; color: #922B21; }
  .summary-box { background: #f8f7ff; border-radius: 12px; padding: 16px; font-size: 13px; line-height: 1.6; color: #333; }
  .steps-box { font-size: 13px; line-height: 1.8; color: #333; }
  .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; }
</style>
</head>
<body>

<div class="header">
  <h1>Hearing Function Screening Report</h1>
  <p>${fmtDate(session.created_at)} &nbsp;·&nbsp; Source: ${session.test_source.replace('_', ' ')}</p>
</div>

<div class="disclaimer">
  <strong>Screening estimate only — not a medical diagnosis.</strong>
  This report is for personal wellness monitoring. Always consult a qualified audiologist or physician for clinical evaluation.
</div>

<div class="top-card">
  <div class="age-label">Hearing Function Age (estimate)</div>
  ${session.hearing_function_age
    ? `<div class="age">${session.hearing_function_age}<span class="age-unit"> yrs</span></div>`
    : '<div class="age" style="font-size:24px">Insufficient data</div>'}
  ${session.percentile_vs_age_peers != null
    ? `<div style="font-size:13px; opacity:0.85; margin-top:6px;">${session.percentile_vs_age_peers}th percentile vs. age peers</div>`
    : ''}
  <div class="badges">
    <span class="badge">Confidence: ${session.confidence}</span>
    <span class="badge">${urgencyLabel(session.urgency)}</span>
  </div>
</div>

${session.urgency !== 'routine' ? `
<div class="red-flag-box">
  <strong>⚠ Recommended Action:</strong> ${nextStepLabel(session.recommended_next_step)}<br/>
  ${session.urgency === 'urgent' ? 'This result warrants prompt medical attention. Please do not delay.' : ''}
</div>` : ''}

<div class="section">
  <h2>Hearing Measurements</h2>
  <table class="kv-table">
    ${session.left_dbhl != null ? `<tr><td>Left ear (dBHL)</td><td>${session.left_dbhl} dBHL</td></tr>` : ''}
    ${session.right_dbhl != null ? `<tr><td>Right ear (dBHL)</td><td>${session.right_dbhl} dBHL</td></tr>` : ''}
    ${session.sin_score != null ? `<tr><td>Speech-in-noise score</td><td>${session.sin_score}/100</td></tr>` : ''}
    <tr><td>Severity band</td><td style="color:${severityColor(pf.severity_band)}">${pf.severity_band.replace('_', ' ')}</td></tr>
    <tr><td>Pattern flags</td><td>${patternList}</td></tr>
  </table>
</div>

<div class="section">
  <h2>Quality & Context</h2>
  <table class="kv-table">
    <tr><td>Confidence</td><td style="color:${confColor(session.confidence)}">${session.confidence}</td></tr>
    <tr><td>Quiet room</td><td>${session.quality_context.quiet_room ? 'Yes' : 'No'}</td></tr>
    <tr><td>Headphones connected</td><td>${session.quality_context.headphones_connected ? 'Yes' : 'No'}</td></tr>
    <tr><td>Recent loud noise</td><td>${session.quality_context.recent_loud_noise_24h ? 'Yes ⚠' : 'No'}</td></tr>
    <tr><td>Cold / allergies</td><td>${session.quality_context.cold_allergy_infection_24h ? 'Yes ⚠' : 'No'}</td></tr>
    <tr><td>Symptoms noted</td><td>${symptomList}</td></tr>
  </table>
</div>

${(aiSummary || aiSteps) ? `
<div class="section">
  <h2>Summary</h2>
  ${aiSummary ? `<div class="summary-box">${aiSummary}</div>` : ''}
  ${aiSteps ? `<div class="steps-box" style="margin-top:12px"><strong>Recommended Next Steps</strong><br/>${aiSteps.replace(/\n/g, '<br/>')}</div>` : ''}
</div>` : ''}

<div class="section">
  <h2>Next Step</h2>
  <div class="summary-box"><strong>${nextStepLabel(session.recommended_next_step)}</strong></div>
</div>

<div class="footer">
  Generated by AI Health Partner &nbsp;·&nbsp; Screening estimate, not a diagnosis &nbsp;·&nbsp; ${fmtDate(session.created_at)}
</div>

</body>
</html>`;
}
