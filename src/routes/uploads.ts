import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { uploadMiddleware, MAX_UPLOAD_BYTES } from '../middleware/multer';
import { createUpload, findUploadById, getSignedUrl } from '../services/uploads/uploadService';
import { AppError } from '../errors/AppError';

const router = Router();

function handleSingleFile(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  uploadMiddleware.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit` });
      return;
    }
    next(err);
  });
}

// POST /api/uploads
router.post(
  '/',
  authMiddleware,
  handleSingleFile,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) throw new AppError('No file provided', 400);
      if (!req.user?.dsUserId || !req.user?.email) throw new AppError('Unauthenticated', 401);

      const upload = await createUpload({
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        buffer: req.file.buffer,
        createdBy: req.user.dsUserId,
        userEmail: req.user.email,
      });

      res.status(201).json({
        data: {
          uploadId: upload.uploadId,
          uploadOriginalName: upload.uploadOriginalName,
          uploadMimeType: upload.uploadMimeType,
          uploadSizeBytes: upload.uploadSizeBytes,
          url: `/api/uploads/${upload.uploadId}`,
        },
      });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// GET /api/uploads/:uploadId — redirects to a 15-min signed GCS URL
router.get('/:uploadId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params['uploadId'];
    const uploadId = rawId !== undefined ? parseInt(rawId, 10) : NaN;
    if (isNaN(uploadId)) throw new AppError('Invalid upload ID', 400);

    const upload = await findUploadById(uploadId);
    const storageKey = upload.uploadStorageKey;
    if (!storageKey) throw new AppError('Upload has no storage key', 500);
    const signedUrl = await getSignedUrl(storageKey);

    res.redirect(302, signedUrl);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
