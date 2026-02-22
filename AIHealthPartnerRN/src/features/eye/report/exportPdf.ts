// src/features/eye/report/exportPdf.ts
// Generate PDF from HTML template and share via share sheet (iOS) or print dialog (web).

import { Platform } from 'react-native';
import { EyeSessionResult } from '../models/types';
import { buildReportHTML } from './reportTemplate';

export async function exportSessionPDF(
  session: EyeSessionResult,
  aiSummary?: string,
  aiSteps?: string[],
): Promise<void> {
  const html = buildReportHTML(session, aiSummary, aiSteps);

  if (Platform.OS === 'web') {
    // Web: open HTML in a new tab and trigger the browser print dialog
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        win.focus();
        win.print();
      };
    } else {
      // Popup blocked — offer direct download as fallback
      const a = document.createElement('a');
      a.href = url;
      a.download = `vision-report-${session.session_id.slice(0, 8)}.html`;
      a.click();
    }
    return;
  }

  // Native (iOS / Android): expo-print → expo-sharing
  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
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
