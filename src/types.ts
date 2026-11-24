export type CodeLanguage = 'C' | 'Java' | 'Auto-Detect';
export type DetectedLanguage = 'C' | 'Java' | 'Unknown';
export type ExplanationLanguage = 'English' | 'French' | 'Moroccan Darija';
export type ErrorCategory = 'Syntax' | 'Logic' | 'Runtime/Memory';

export interface CodeErrorItem {
  type: ErrorCategory;
  line: string;
  snippet: string;
  explanation: string;
  fix: string;
}

export interface ExecutionComparison {
  sampleInput: string;
  buggyBehavior: string;
  expectedFixedOutput: string;
}

export interface DebugAnalysisResult {
  isValidCodeInput: boolean;
  validationMessage?: string;
  detectedLanguage: DetectedLanguage;
  extractedCode?: string;
  summary: string;
  errors: CodeErrorItem[];
  correctedCode: string;
  executionComparison: ExecutionComparison;
  modelUsed?: string;
}

export interface HistorySession {
  id: string;
  timestamp: number;
  language: 'C' | 'Java';
  explanationLanguage: ExplanationLanguage;
  originalCode: string;
  contextNote?: string;
  result: DebugAnalysisResult;
  counts: {
    syntax: number;
    logic: number;
    runtime: number;
    total: number;
  };
}

export interface UploadedImageState {
  name: string;
  mimeType: string;
  base64Data: string;
  dataUrl: string;
}
