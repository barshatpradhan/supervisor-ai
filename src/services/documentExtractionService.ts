import type {
  DocumentExtractionInput,
  DocumentExtractionResult,
} from "../types/document.js";

const TEXT_MIME_TYPE = "text/plain";
const PDF_MIME_TYPE = "application/pdf";
const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function extractTxt(input: DocumentExtractionInput): DocumentExtractionResult {
  return {
    text: input.buffer.toString("utf8").trim(),
    status: "extracted",
  };
}

function extractPdf(input: DocumentExtractionInput): DocumentExtractionResult {
  return {
    text: "",
    status: "pending",
    error: `PDF text extraction is not implemented yet for ${input.originalName}.`,
  };
}

function extractDocx(input: DocumentExtractionInput): DocumentExtractionResult {
  return {
    text: "",
    status: "pending",
    error: `DOCX text extraction is not implemented yet for ${input.originalName}.`,
  };
}

export async function extractDocumentText(
  input: DocumentExtractionInput
): Promise<DocumentExtractionResult> {
  if (input.mimeType === TEXT_MIME_TYPE) {
    return extractTxt(input);
  }

  if (input.mimeType === PDF_MIME_TYPE) {
    return extractPdf(input);
  }

  if (input.mimeType === DOCX_MIME_TYPE) {
    return extractDocx(input);
  }

  return {
    text: "",
    status: "failed",
    error: "Unsupported document type.",
  };
}
