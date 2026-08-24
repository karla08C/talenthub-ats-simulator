/**
 * Type definitions for PDF.js text extraction
 * Eliminates unsafe 'any' type usage
 */

export interface PDFTextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
}

export interface PDFTextContent {
  items: PDFTextItem[];
  style: Record<string, unknown>;
}

export interface PDFPage {
  getTextContent(): Promise<PDFTextContent>;
}

export interface PDFDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPage>;
}

export interface PDFDocumentProxy {
  promise: Promise<PDFDocument>;
}
