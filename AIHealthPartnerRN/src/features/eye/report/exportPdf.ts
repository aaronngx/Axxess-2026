// src/features/eye/report/exportPdf.ts
// Generate PDF from HTML template and share via share sheet.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { EyeSessionResult } from '../models/types';
import { buildReportHTML } from './reportTemplate';

export async function exportSessionPDF(
  session: EyeSessionResult,
  aiSummary?: string,
  aiSteps?: string[],
): Promise<void> {
  const html = buildReportHTML(session, aiSummary, aiSteps);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Vision Report',
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}
