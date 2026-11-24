import { CodeErrorItem, DebugAnalysisResult, ExplanationLanguage, HistorySession } from '../types';

export interface DiffLine {
  type: 'equal' | 'add' | 'remove';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

/**
 * Computes a line-by-line Myers/LCS diff between originalCode and correctedCode.
 */
export function computeLineDiff(originalCode: string, correctedCode: string): DiffLine[] {
  const oldLines = originalCode.replace(/\r\n/g, '\n').split('\n');
  const newLines = correctedCode.replace(/\r\n/g, '\n').split('\n');

  const m = oldLines.length;
  const n = newLines.length;

  // LCS matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      diff.push({
        type: 'equal',
        oldLineNumber: i + 1,
        newLineNumber: j + 1,
        content: oldLines[i],
      });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      diff.push({
        type: 'remove',
        oldLineNumber: i + 1,
        content: oldLines[i],
      });
      i++;
    } else {
      diff.push({
        type: 'add',
        newLineNumber: j + 1,
        content: newLines[j],
      });
      j++;
    }
  }

  while (i < m) {
    diff.push({
      type: 'remove',
      oldLineNumber: i + 1,
      content: oldLines[i],
    });
    i++;
  }

  while (j < n) {
    diff.push({
      type: 'add',
      newLineNumber: j + 1,
      content: newLines[j],
    });
    j++;
  }

  return diff;
}

/**
 * Counts errors by category (Syntax, Logic, Runtime/Memory).
 */
export function summarizeErrorCounts(errors: CodeErrorItem[]): {
  syntax: number;
  logic: number;
  runtime: number;
  total: number;
} {
  let syntax = 0;
  let logic = 0;
  let runtime = 0;

  for (const err of errors) {
    if (err.type === 'Syntax') {
      syntax++;
    } else if (err.type === 'Logic') {
      logic++;
    } else {
      runtime++;
    }
  }

  return {
    syntax,
    logic,
    runtime,
    total: syntax + logic + runtime,
  };
}

/**
 * Infers language from file name extension (.c, .h, .java, .txt).
 */
export function detectLanguageFromFilename(filename: string): {
  supported: boolean;
  language: 'C' | 'Java' | 'Auto-Detect';
  extension: string;
} {
  const lower = filename.trim().toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  const ext = dotIdx !== -1 ? lower.slice(dotIdx) : '';

  if (ext === '.c' || ext === '.h') {
    return { supported: true, language: 'C', extension: ext };
  }
  if (ext === '.java') {
    return { supported: true, language: 'Java', extension: ext };
  }
  if (ext === '.txt') {
    return { supported: true, language: 'Auto-Detect', extension: ext };
  }

  return { supported: false, language: 'Auto-Detect', extension: ext };
}

/**
 * Heuristic check to detect whether code is C or Java when Auto-Detect is selected.
 */
export function detectLanguageFromCode(code: string): 'C' | 'Java' | 'Unknown' {
  const trimmed = code.trim();
  if (!trimmed) return 'Unknown';

  const cMarkers = [
    /#include\s*[<"]/i,
    /\bprintf\s*\(/,
    /\bscanf\s*\(/,
    /\bmalloc\s*\(/,
    /\bfree\s*\(/,
    /\bint\s+main\s*\(/,
    /\bsizeof\s*\(/,
    /->/,
  ];

  const javaMarkers = [
    /\bpublic\s+class\s+\w+/,
    /\bpublic\s+static\s+void\s+main\s*\(/,
    /\bSystem\.out\.print/,
    /\bimport\s+java\./,
    /\bArrayList\s*</,
    /\bString\[\]\s+args\b/,
    /\bnew\s+\w+\[/,
  ];

  let cScore = 0;
  let javaScore = 0;

  for (const regex of cMarkers) {
    if (regex.test(trimmed)) cScore++;
  }
  for (const regex of javaMarkers) {
    if (regex.test(trimmed)) javaScore++;
  }

  if (javaScore > cScore && javaScore > 0) return 'Java';
  if (cScore > javaScore && cScore > 0) return 'C';

  // Fallback check for general C/Java syntax constructs
  if (/[{};()]/.test(trimmed) && /\b(int|void|char|float|double|return|if|for|while)\b/.test(trimmed)) {
    return 'C';
  }

  return 'Unknown';
}

export const MAX_HISTORY_ITEMS = 20;

/**
 * Inserts a new HistorySession at the top of the list and caps it at 20 items.
 */
export function prependHistorySession(
  existing: HistorySession[],
  newSession: HistorySession
): HistorySession[] {
  const filtered = existing.filter((item) => item.id !== newSession.id);
  return [newSession, ...filtered].slice(0, MAX_HISTORY_ITEMS);
}

/**
 * Builds a HistorySession object from an analysis result.
 */
export function createHistorySession(params: {
  id: string;
  timestamp: number;
  originalCode: string;
  contextNote?: string;
  explanationLanguage: ExplanationLanguage;
  result: DebugAnalysisResult;
}): HistorySession {
  const counts = summarizeErrorCounts(params.result.errors);
  const lang: 'C' | 'Java' =
    params.result.detectedLanguage === 'Java' ? 'Java' : 'C';

  return {
    id: params.id,
    timestamp: params.timestamp,
    language: lang,
    explanationLanguage: params.explanationLanguage,
    originalCode: params.originalCode,
    contextNote: params.contextNote,
    result: params.result,
    counts,
  };
}
