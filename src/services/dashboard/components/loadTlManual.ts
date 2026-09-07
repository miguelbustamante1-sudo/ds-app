import { downloadFromGCS } from '../../uploads/gcsClient';
import { AppError } from '../../../errors/AppError';

const TL_MANUAL_OBJECT_NAME = 'tl-manual.md';

/**
 * Reads the TL manual markdown that seeds trivia generation from GCS (object
 * name `tl-manual.md`, uploaded separately — this function does not manage
 * the upload). Local dev without real GCS credentials can still exercise this
 * by setting `LOCAL_FILE_STORAGE=true` and placing a copy at
 * `uploads/tl-manual.md`, per the existing convention in `gcsClient.ts`.
 */
export async function loadTlManual(): Promise<string> {
  const buffer = await downloadFromGCS(TL_MANUAL_OBJECT_NAME);
  const text = buffer.toString('utf-8');

  if (!text.trim()) {
    throw new AppError('TL manual source is empty', 500);
  }

  return text;
}
