import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import type { DocumentExtractionInput, DocumentExtractionResult } from "../types/document.js";
import { AppError } from "../utils/appError.js";

interface DocumentTextExtractor {
  supports(mimeType: string): boolean;
  extract(input: DocumentExtractionInput): Promise<DocumentExtractionResult>;
}

const TEXT_MIME_TYPE = "text/plain";
const PDF_MIME_TYPE = "application/pdf";
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const txtExtractor: DocumentTextExtractor = {
  supports: (mimeType) => mimeType === TEXT_MIME_TYPE,
  async extract(input) {
    return {
      text: input.buffer.toString("utf8").trim(),
      status: "extracted",
      metadata: { format: "txt" },
    };
  },
};

const pdfExtractor: DocumentTextExtractor = {
  supports: (mimeType) => mimeType === PDF_MIME_TYPE,
  async extract(input) {
    const parser = new PDFParse({ data: input.buffer });
    try {
      const [textResult, infoResult] = await Promise.all([parser.getText(), parser.getInfo()]);
      return {
        text: textResult.text.trim(),
        status: "extracted",
        pageCount: infoResult.total,
        metadata: { format: "pdf" },
      };
    } finally {
      await parser.destroy();
    }
  },
};

const docxExtractor: DocumentTextExtractor = {
  supports: (mimeType) => mimeType === DOCX_MIME_TYPE,
  async extract(input) {
    const result = await mammoth.extractRawText({ buffer: input.buffer });
    return {
      text: result.value.trim(),
      status: "extracted",
      metadata: { format: "docx", warnings: result.messages.length },
    };
  },
};

const extractors: DocumentTextExtractor[] = [txtExtractor, pdfExtractor, docxExtractor];

export async function extractDocumentText(input: DocumentExtractionInput): Promise<DocumentExtractionResult> {
  const extractor = extractors.find((candidate) => candidate.supports(input.mimeType));
  if (!extractor) {
    throw new AppError("Unsupported document type.", 400);
  }

  try {
    const result = await extractor.extract(input);
    if (!result.text) {
      throw new AppError("The document does not contain extractable text.", 422);
    }
    return result;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Unable to extract text from the uploaded document.", 422, true, { cause: error });
  }
}
