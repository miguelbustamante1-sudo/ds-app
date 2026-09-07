import { callFuelIx } from '../../aiInsights/fuelixClient';
import { findUploadById, getSignedUrl } from '../../uploads/uploadService';
import { AppError } from '../../../errors/AppError';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fetches the transcript from GCS and asks Fuel iX to extract
 * the meeting date. Returns an ISO 8601 date string (YYYY-MM-DD)
 * or null if extraction fails or no date is found.
 */
export async function extractMeetingDate(uploadId: number): Promise<string | null> {
  const upload = await findUploadById(uploadId);

  const signedUrl = await getSignedUrl(upload.uploadStorageKey);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new AppError('Failed to fetch transcript from storage', 502);
  const transcriptText = await response.text();

  if (!transcriptText.trim()) return null;

  const aiResponse = await callFuelIx({
    model: 'claude-haiku-4-5',
    messages: [
      {
        role: 'system',
        content:
          'You are a date extraction assistant. Extract the meeting date from the transcript text provided. ' +
          'Respond with ONLY the date in ISO 8601 format (YYYY-MM-DD). ' +
          'If no meeting date is found, respond with exactly: NO_DATE_FOUND',
      },
      {
        role: 'user',
        content: transcriptText.slice(0, 8000),
      },
    ],
    temperature: 0,
    max_tokens: 20,
  });

  const raw = aiResponse.choices[0]?.message?.content?.trim() ?? '';
  if (raw === 'NO_DATE_FOUND' || !ISO_DATE_REGEX.test(raw)) return null;

  return raw;
}
