import type { NextFunction, Request, Response } from "express";
import {
  getProjectDocumentById,
  listProjectDocuments,
  uploadProjectDocument,
} from "../services/projectDocumentService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { requireUuid } from "../utils/validation.js";

export async function listProjectDocumentsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const projectId = requireUuid(req.params.projectId, "Project id");
    const documents = await listProjectDocuments(req.user.id, projectId);

    return sendSuccess(
      res,
      200,
      "Project documents fetched successfully.",
      documents
    );
  } catch (error) {
    return next(error);
  }
}

export async function getProjectDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const projectId = requireUuid(req.params.projectId, "Project id");
    const documentId = requireUuid(req.params.documentId, "Document id");
    const document = await getProjectDocumentById(
      req.user.id,
      projectId,
      documentId
    );

    return sendSuccess(
      res,
      200,
      "Project document fetched successfully.",
      document
    );
  } catch (error) {
    return next(error);
  }
}

export async function uploadProjectDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const projectId = requireUuid(req.params.projectId, "Project id");

    if (!req.file) {
      throw new AppError("Project document file is required.", 400);
    }

    const result = await uploadProjectDocument(req.user.id, projectId, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer,
    });

    return sendSuccess(
      res,
      201,
      "Project document uploaded and analyzed successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
}
