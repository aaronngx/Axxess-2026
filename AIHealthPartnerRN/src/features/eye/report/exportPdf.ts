// src/features/eye/report/exportPdf.ts
// Generate PDF from HTML template and share via expo-sharing (Android / iOS)
// or browser print dialog (web).

import { Platform, Alert } from 'react-native';
import { EyeSessionResult } from '../models/types';
import { buildReportHTML } from './reportTemplate';

export async function exportSessionPDF(
  session: EyeSessionResult,
  aiSummary?: string,
  aiSteps?: string[],
): Promise<void> {
  const html = buildReportHTML(session, aiSummary, aiSteps);

  if (Platform.OS === 'web') {
    // Web: open HTML in new tab and trigger browser print dialog.
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.onload = () => { win.focus(); win.print(); };
      } else {
        // Popup blocked — download as HTML file instead.
        const a = document.createElement('a');
        a.href = url;
        a.download = `vision-report-${session.session_id.slice(0, 8)}.html`;
        a.click();
      }
    } catch (err: any) {
      Alert.alert('Export failed', err?.message ?? 'Could not open print dialog.');
    }
    return;
  }

  // Native (Android / iOS): expo-print → PDF file → expo-sharing
  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');

    // printToFileAsync writes an HTML-based PDF to a temp file and returns its URI.
    const { uri } = await Print.printToFileAsync({ html });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      // Sharing API unavailable — this is rare on Pixel 7 but handle gracefully.
      Alert.alert(
        'Sharing unavailable',
        `PDF saved at:\n${uri}\n\nOpen a file manager to access it.`,
      );
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Vision Report',
      UTI: 'com.adobe.pdf', // iOS only — ignored on Android
    });
  } catch (err: any) {
    // Surface a descriptive error to the user so the failure isn't silent.
    const msg = err?.message ?? 'Unknown error generating PDF.';
    Alert.alert('PDF Export Failed', msg);
    throw err; // re-throw so EyeResults can clear the loading state
  }
}
