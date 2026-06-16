import multer from "multer";
import type { RequestHandler } from "express";
import { AppError } from "../utils/appError.js";

export const PROJECT_DOCUMENT_BUCKET = "project-documents";
export const MAX_PROJECT_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_PROJECT_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PROJECT_DOCUMENT_BYTES,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (
      !SUPPORTED_PROJECT_DOCUMENT_MIME_TYPES.includes(
        file.mimetype as (typeof SUPPORTED_PROJECT_DOCUMENT_MIME_TYPES)[number]
      )
    ) {
      callback(new AppError("Unsupported document type.", 400));
      return;
    }

    callback(null, true);
  },
});

const uploadProjectDocument = upload.single("file");

export const uploadProjectDocumentFile: RequestHandler = (req, res, next) => {
  uploadProjectDocument(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new AppError("Uploaded document exceeds the 10 MB size limit.", 400));
        return;
      }

      next(new AppError("Invalid document upload.", 400));
      return;
    }

    next(error);
  });
};
