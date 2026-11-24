import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Copy,
  Check,
  Download,
  Terminal,
  GitCompare,
  Wrench,
  ListFilter,
  Code,
} from 'lucide-react';
import { DebugAnalysisResult, ErrorCategory } from '../types';
import { computeLineDiff, summarizeErrorCounts } from '../utils/debuggerUtils';

interface ResultsPanelProps {
  originalCode: string;
  result: DebugAnalysisResult | null;
  isAnalyzing: boolean;
}

type ResultTab = 'errors' | 'corrected' | 'diff' | 'execution';

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  originalCode,
  result,
  isAnalyzing,
}) => {
  const [activeTab, setActiveTab] = useState<ResultTab>('errors');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ErrorCategory>('ALL');
  const [copiedFixed, setCopiedFixed] = useState(false);

  const counts = useMemo(() => {
    if (!result) return { syntax: 0, logic: 0, runtime: 0, total: 0 };
    return summarizeErrorCounts(result.errors);
  }, [result]);

  const diffLines = useMemo(() => {
    if (!result) return [];
    const baseCode = result.extractedCode?.trim()
      ? result.extractedCode
      : originalCode;
    return computeLineDiff(baseCode, result.correctedCode || '');
  }, [originalCode, result]);

  const filteredErrors = useMemo(() => {
    if (!result) return [];
    if (categoryFilter === 'ALL') return result.errors;
    return result.errors.filter((e) => e.type === categoryFilter);
  }, [result, categoryFilter]);

  const handleCopyCode = async () => {
    if (!result?.correctedCode) return;
    try {
      await navigator.clipboard.writeText(result.correctedCode);
      setCopiedFixed(true);
      setTimeout(() => setCopiedFixed(false), 2000);
    } catch {
      // Fallback copy via temporary textarea
      const el = document.createElement('textarea');
      el.value = result.correctedCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedFixed(true);
      setTimeout(() => setCopiedFixed(false), 2000);
    }
  };

  const handleDownloadFixedFile = () => {
    if (!result?.correctedCode) return;
    const isJava = result.detectedLanguage === 'Java';
    let filename = isJava ? 'Main.java' : 'fixed_program.c';

    if (isJava) {
      const classMatch = result.correctedCode.match(/\bpublic\s+class\s+(\w+)/);
      if (classMatch?.[1]) {
        filename = `${classMatch[1]}.java`;
      }
    }

    const blob = new Blob([result.correctedCode], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const correctedLines = useMemo(() => {
    if (!result?.correctedCode) return [];
    return result.correctedCode.replace(/\r\n/g, '\n').split('\n');
  }, [result]);

  return (
    <section
      aria-label="Debugging Results Panel"
      className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden h-full"
    >
      {/* 1. Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0d1117]/60 border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#e6edf3]">
            Diagnostic Report
          </span>
          {result && result.isValidCodeInput && (
            <span className="text-xs text-[#8b949e] font-mono">
              · {result.detectedLanguage}
            </span>
          )}
        </div>

        {/* Summary Counters / Filter Buttons */}
        {result && result.isValidCodeInput ? (
          counts.total === 0 ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3fb950]">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>No Errors Found</span>
            </div>
          ) : (
            <div
              role="group"
              aria-label="Error Category Counts"
              className="flex flex-wrap items-center gap-1.5 font-mono text-xs tabular-nums"
            >
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter(
                    categoryFilter === 'Syntax' ? 'ALL' : 'Syntax'
                  );
                  setActiveTab('errors');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === 'Syntax'
                    ? 'bg-[#f85149]/20 border-[#f85149] text-[#ff7b72]'
                    : 'bg-[#0d1117] border-[#30363d] text-[#ff7b72] hover:border-[#f85149]/60'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Syntax Errors: {counts.syntax}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter(
                    categoryFilter === 'Logic' ? 'ALL' : 'Logic'
                  );
                  setActiveTab('errors');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === 'Logic'
                    ? 'bg-[#f0883e]/20 border-[#f0883e] text-[#ffa657]'
                    : 'bg-[#0d1117] border-[#30363d] text-[#ffa657] hover:border-[#f0883e]/60'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Logical Errors: {counts.logic}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter(
                    categoryFilter === 'Runtime/Memory'
                      ? 'ALL'
                      : 'Runtime/Memory'
                  );
                  setActiveTab('errors');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === 'Runtime/Memory'
                    ? 'bg-[#d29922]/20 border-[#d29922] text-[#e3b341]'
                    : 'bg-[#0d1117] border-[#30363d] text-[#e3b341] hover:border-[#d29922]/60'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Runtime/Memory Warnings: {counts.runtime}</span>
              </button>
            </div>
          )
        ) : (
          <span className="text-xs text-[#8b949e]">
            Ready to inspect C or Java code
          </span>
        )}
      </div>

      {/* Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Analysis Result Views"
        className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-[#161b22] border-b border-[#30363d]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'errors'}
          onClick={() => setActiveTab('errors')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'errors'
              ? 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]'
              : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5 text-[#58a6ff]" aria-hidden="true" />
          <span>Errors Breakdown ({counts.total})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'corrected'}
          onClick={() => setActiveTab('corrected')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'corrected'
              ? 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]'
              : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-[#3fb950]" aria-hidden="true" />
          <span>Corrected Code</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'diff'}
          onClick={() => setActiveTab('diff')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'diff'
              ? 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]'
              : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5 text-[#a371f7]" aria-hidden="true" />
          <span>Diff View (Before vs. After)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'execution'}
          onClick={() => setActiveTab('execution')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'execution'
              ? 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]'
              : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-[#f0883e]" aria-hidden="true" />
          <span>Execution Trace / Test Case</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#0d1117]">
        {isAnalyzing ? (
          /* Skeleton Loading State */
          <div className="space-y-4 py-2" aria-live="polite">
            <div className="h-14 rounded-lg bg-[#161b22] border border-[#30363d] p-4 animate-pulse" />
            <div className="h-32 rounded-lg bg-[#161b22] border border-[#30363d] p-4 animate-pulse" />
            <div className="h-32 rounded-lg bg-[#161b22] border border-[#30363d] p-4 animate-pulse" />
          </div>
        ) : !result || !result.isValidCodeInput ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center px-6">
            <Code className="w-10 h-10 text-[#30363d] mb-3" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[#e6edf3] mb-1">
              {result && !result.isValidCodeInput
                ? 'Invalid or Unrecognized Code Input'
                : 'No Analysis Running Yet'}
            </h3>
            <p className="text-xs text-[#8b949e] max-w-md leading-relaxed">
              {result && !result.isValidCodeInput
                ? result.validationMessage ||
                  'Please paste valid C or Java source code or upload a clear code screenshot.'
                : 'Paste your C or Java source code on the left, upload a .c / .java file, or load a buggy example, then click "Analyze & Fix Code".'}
            </p>
          </div>
        ) : (
          <>
            {/* Concise Summary Banner */}
            {result.summary && (
              <div className="mb-4 p-3.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs text-[#c9d1d9] leading-relaxed">
                <span className="font-semibold text-[#e6edf3] mr-1.5">
                  Summary:
                </span>
                <span>{result.summary}</span>
              </div>
            )}

            {/* TAB 1: ERRORS BREAKDOWN */}
            {activeTab === 'errors' && (
              <div className="space-y-3">
                {categoryFilter !== 'ALL' && (
                  <div className="flex items-center justify-between text-xs text-[#8b949e] pb-1">
                    <span>
                      Showing <strong className="text-[#e6edf3]">{categoryFilter}</strong> issues ({filteredErrors.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('ALL')}
                      className="text-[#58a6ff] hover:underline cursor-pointer"
                    >
                      Show all ({counts.total})
                    </button>
                  </div>
                )}

                {counts.total === 0 ? (
                  <div className="p-6 rounded-lg bg-[#161b22] border border-[#238636]/50 text-center">
                    <CheckCircle2
                      className="w-8 h-8 text-[#3fb950] mx-auto mb-2"
                      aria-hidden="true"
                    />
                    <h4 className="text-sm font-semibold text-[#e6edf3] mb-1">
                      Zero Errors Detected
                    </h4>
                    <p className="text-xs text-[#8b949e]">
                      Your {result.detectedLanguage} code has no syntax errors, logical flaws, or runtime/memory hazards.
                    </p>
                  </div>
                ) : filteredErrors.length === 0 ? (
                  <div className="p-6 rounded-lg bg-[#161b22] border border-[#30363d] text-center text-xs text-[#8b949e]">
                    No issues in the &ldquo;{categoryFilter}&rdquo; category.
                  </div>
                ) : (
                  filteredErrors.map((err, idx) => {
                    const isSyntax = err.type === 'Syntax';
                    const isLogic = err.type === 'Logic';

                    const typeColor = isSyntax
                      ? 'text-[#ff7b72]'
                      : isLogic
                      ? 'text-[#ffa657]'
                      : 'text-[#e3b341]';

                    const TypeIcon = isSyntax
                      ? XCircle
                      : isLogic
                      ? AlertTriangle
                      : Cpu;

                    return (
                      <article
                        key={`${err.line}-${idx}`}
                        className="rounded-lg bg-[#161b22] border border-[#30363d] p-4 space-y-3"
                      >
                        {/* Error Card Header: Type + Line Number */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <TypeIcon
                              className={`w-4 h-4 shrink-0 ${typeColor}`}
                              aria-hidden="true"
                            />
                            <span className={`font-semibold ${typeColor}`}>
                              {err.type}
                            </span>
                            <span className="text-[#484f58]" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-mono text-[#e6edf3] tabular-nums">
                              Line {err.line}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#8b949e] tabular-nums">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Problematic Code Snippet */}
                        <div>
                          <div className="text-[11px] text-[#8b949e] mb-1">
                            Problematic snippet:
                          </div>
                          <pre className="p-2.5 rounded bg-[#0d1117] border border-[#f85149]/30 text-[#ff7b72] font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                            <code>{err.snippet}</code>
                          </pre>
                        </div>

                        {/* Clear Explanation */}
                        <p className="text-xs text-[#e6edf3] leading-relaxed">
                          {err.explanation}
                        </p>

                        {/* Suggested Fix Snippet */}
                        {err.fix && (
                          <div>
                            <div className="text-[11px] text-[#8b949e] mb-1">
                              Recommended fix:
                            </div>
                            <pre className="p-2.5 rounded bg-[#0d1117] border border-[#3fb950]/30 text-[#7ee787] font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                              <code>{err.fix}</code>
                            </pre>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: CORRECTED CODE */}
            {activeTab === 'corrected' && (
              <div className="rounded-lg bg-[#161b22] border border-[#30363d] overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#21262d]/60 border-b border-[#30363d]">
                  <span className="text-xs font-mono text-[#8b949e] tabular-nums">
                    {result.detectedLanguage === 'Java'
                      ? 'Fixed Java Source (.java)'
                      : 'Fixed C Source (.c)'}{' '}
                    · {correctedLines.length} lines
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#e6edf3] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedFixed ? (
                        <>
                          <Check
                            className="w-3.5 h-3.5 text-[#3fb950]"
                            aria-hidden="true"
                          />
                          <span className="text-[#3fb950]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadFixedFile}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#238636] hover:bg-[#2ea043] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Download Fixed File</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto bg-[#0d1117] py-3">
                  <table className="w-full border-collapse font-mono text-xs leading-6">
                    <tbody>
                      {correctedLines.map((line, i) => (
                        <tr
                          key={i}
                          className="hover:bg-[#161b22]/80 transition-colors"
                        >
                          <td className="w-12 px-3 text-right select-none text-[#6e7681] border-r border-[#21262d] tabular-nums">
                            {i + 1}
                          </td>
                          <td className="px-4 text-[#e6edf3] whitespace-pre">
                            {line || ' '}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: DIFF VIEW (BEFORE VS AFTER) */}
            {activeTab === 'diff' && (
              <div className="rounded-lg bg-[#161b22] border border-[#30363d] overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#21262d]/60 border-b border-[#30363d] text-xs">
                  <span className="font-medium text-[#e6edf3]">
                    Unified Line Comparison
                  </span>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span className="text-[#ff7b72]">
                      -{' '}
                      {diffLines.filter((d) => d.type === 'remove').length}{' '}
                      removed
                    </span>
                    <span className="text-[#484f58]" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[#7ee787]">
                      + {diffLines.filter((d) => d.type === 'add').length} added
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto bg-[#0d1117] py-2">
                  <table className="w-full border-collapse font-mono text-xs leading-6">
                    <tbody>
                      {diffLines.map((row, idx) => {
                        const isAdd = row.type === 'add';
                        const isRemove = row.type === 'remove';

                        const rowBg = isAdd
                          ? 'bg-[#2ea043]/15 text-[#7ee787]'
                          : isRemove
                          ? 'bg-[#f85149]/15 text-[#ff7b72]'
                          : 'text-[#c9d1d9]';

                        const prefix = isAdd ? '+' : isRemove ? '-' : ' ';

                        return (
                          <tr key={idx} className={rowBg}>
                            <td className="w-10 px-2 text-right select-none text-[#6e7681] border-r border-[#21262d] tabular-nums">
                              {row.oldLineNumber ?? ''}
                            </td>
                            <td className="w-10 px-2 text-right select-none text-[#6e7681] border-r border-[#21262d] tabular-nums">
                              {row.newLineNumber ?? ''}
                            </td>
                            <td className="w-6 px-2 text-center select-none font-bold">
                              {prefix}
                            </td>
                            <td className="pr-4 whitespace-pre">
                              {row.content || ' '}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: EXECUTION TRACE / TEST CASE */}
            {activeTab === 'execution' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-[#161b22] border border-[#30363d] p-4">
                  <div className="text-xs font-semibold text-[#e6edf3] mb-1.5">
                    Sample Test Input / Execution Context
                  </div>
                  <pre className="p-3 rounded bg-[#0d1117] border border-[#30363d] font-mono text-xs text-[#79c0ff] overflow-x-auto whitespace-pre-wrap">
                    <code>
                      {result.executionComparison.sampleInput ||
                        'Standard execution with no stdin arguments'}
                    </code>
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Buggy Behavior */}
                  <div className="rounded-lg bg-[#161b22] border border-[#f85149]/40 p-4 flex flex-col">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#ff7b72] mb-2">
                      <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Original Code Behavior (Before Fix)</span>
                    </div>
                    <pre className="flex-1 p-3 rounded bg-[#0d1117] border border-[#21262d] font-mono text-xs text-[#ffa198] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      <code>{result.executionComparison.buggyBehavior}</code>
                    </pre>
                  </div>

                  {/* Fixed Output */}
                  <div className="rounded-lg bg-[#161b22] border border-[#3fb950]/40 p-4 flex flex-col">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#3fb950] mb-2">
                      <CheckCircle2
                        className="w-4 h-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Corrected Code Output (After Fix)</span>
                    </div>
                    <pre className="flex-1 p-3 rounded bg-[#0d1117] border border-[#21262d] font-mono text-xs text-[#7ee787] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      <code>
                        {result.executionComparison.expectedFixedOutput}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
