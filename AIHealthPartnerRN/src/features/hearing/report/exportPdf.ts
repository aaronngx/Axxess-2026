// src/features/hearing/report/exportPdf.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { HearingSessionResult } from '../models/types';
import { buildHearingReportHTML } from './reportTemplate';

export async function exportHearingPDF(
  session: HearingSessionResult,
  aiSummary?: string,
  aiSteps?: string,
): Promise<void> {
  const html = buildHearingReportHTML(session, aiSummary, aiSteps);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Hearing Report' });
}
