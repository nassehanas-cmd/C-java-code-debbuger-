/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  CodeLanguage,
  DebugAnalysisResult,
  ExplanationLanguage,
  HistorySession,
  UploadedImageState,
} from './types';
import {
  BUGGY_C_CONTEXT,
  BUGGY_C_EXAMPLE,
  BUGGY_JAVA_CONTEXT,
  BUGGY_JAVA_EXAMPLE,
  CLEAN_C_EXAMPLE,
  getPrecomputedCAnalysis,
} from './utils/examples';
import {
  createHistorySession,
  prependHistorySession,
} from './utils/debuggerUtils';
import { TopNav } from './components/TopNav';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { HistoryDrawer } from './components/HistoryDrawer';

const HISTORY_STORAGE_KEY = 'c_java_debugger_history_v1';

export default function App() {
  const [language, setLanguage] = useState<CodeLanguage>('C');
  const [explanationLanguage, setExplanationLanguage] =
    useState<ExplanationLanguage>('English');
  const [code, setCode] = useState<string>(BUGGY_C_EXAMPLE);
  const [contextNote, setContextNote] = useState<string>(BUGGY_C_CONTEXT);
  const [uploadedImage, setUploadedImage] = useState<UploadedImageState | null>(
    null
  );
  const [result, setResult] = useState<DebugAnalysisResult | null>(() =>
    getPrecomputedCAnalysis('English')
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistorySessions(parsed);
        }
      }
    } catch {
      // Ignore malformed localStorage
    }
  }, []);

  // Refresh preloaded C example translation when Explanation Language changes before custom runs
  useEffect(() => {
    if (!activeSessionId && code === BUGGY_C_EXAMPLE) {
      setResult(getPrecomputedCAnalysis(explanationLanguage));
    }
  }, [explanationLanguage, activeSessionId, code]);

  const saveHistoryToStorage = (sessions: HistorySession[]) => {
    setHistorySessions(sessions);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore quota errors
    }
  };

  const handleLoadBuggyC = () => {
    setLanguage('C');
    setCode(BUGGY_C_EXAMPLE);
    setContextNote(BUGGY_C_CONTEXT);
    setUploadedImage(null);
    setBannerMessage(null);
  };

  const handleLoadBuggyJava = () => {
    setLanguage('Java');
    setCode(BUGGY_JAVA_EXAMPLE);
    setContextNote(BUGGY_JAVA_CONTEXT);
    setUploadedImage(null);
    setBannerMessage(null);
  };

  const handleLoadCleanC = () => {
    setLanguage('C');
    setCode(CLEAN_C_EXAMPLE);
    setContextNote('Add two integers and print their sum.');
    setUploadedImage(null);
    setBannerMessage(null);
  };

  const handleClearEditor = () => {
    setCode('');
    setContextNote('');
    setUploadedImage(null);
    setResult(null);
    setBannerMessage(null);
    setActiveSessionId(null);
  };

  const handleAnalyze = async () => {
    setBannerMessage(null);

    if (!code.trim() && !uploadedImage) {
      setBannerMessage({
        type: 'error',
        text: 'Editor is empty. Paste C or Java source code, upload a .c / .java file, or attach a screenshot first.',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          explanationLanguage,
          context: contextNote,
          image: uploadedImage
            ? {
                mimeType: uploadedImage.mimeType,
                base64Data: uploadedImage.base64Data,
              }
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setBannerMessage({
          type: 'error',
          text:
            data?.error ||
            'Failed to analyze code. Please verify your input and try again.',
        });
        return;
      }

      const analysis = data as DebugAnalysisResult;

      if (!analysis.isValidCodeInput) {
        setResult(analysis);
        setBannerMessage({
          type: 'error',
          text:
            analysis.validationMessage ||
            'The input could not be recognized as valid C or Java code.',
        });
        return;
      }

      // If an image was uploaded and Gemini extracted code, populate the editor
      let effectiveOriginalCode = code;
      if (analysis.extractedCode && analysis.extractedCode.trim()) {
        effectiveOriginalCode = analysis.extractedCode.trim();
        setCode(effectiveOriginalCode);
        setBannerMessage({
          type: 'info',
          text: 'Extracted source code from your uploaded screenshot into the editor.',
        });
      }

      if (
        language === 'Auto-Detect' &&
        (analysis.detectedLanguage === 'C' ||
          analysis.detectedLanguage === 'Java')
      ) {
        setLanguage(analysis.detectedLanguage);
      }

      setResult(analysis);

      // Save successful analysis to localStorage history (up to 20 sessions)
      const newSession = createHistorySession({
        id: `session-${Date.now()}`,
        timestamp: Date.now(),
        originalCode: effectiveOriginalCode,
        contextNote,
        explanationLanguage,
        result: analysis,
      });

      const updatedHistory = prependHistorySession(historySessions, newSession);
      saveHistoryToStorage(updatedHistory);
      setActiveSessionId(newSession.id);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Network error while communicating with the debugging server.';
      setBannerMessage({
        type: 'error',
        text: message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectHistorySession = (session: HistorySession) => {
    setLanguage(session.language);
    setExplanationLanguage(session.explanationLanguage);
    setCode(session.originalCode);
    setContextNote(session.contextNote || '');
    setUploadedImage(null);
    setResult(session.result);
    setActiveSessionId(session.id);
    setBannerMessage(null);
  };

  const handleDeleteHistorySession = (id: string) => {
    const updated = historySessions.filter((item) => item.id !== id);
    saveHistoryToStorage(updated);
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
  };

  const handleClearAllHistory = () => {
    saveHistoryToStorage([]);
    setActiveSessionId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#e6edf3]">
      {/* Top Navigation Bar */}
      <TopNav
        historyCount={historySessions.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onLoadBuggyC={handleLoadBuggyC}
        onLoadBuggyJava={handleLoadBuggyJava}
        onLoadCleanC={handleLoadCleanC}
      />

      {/* Responsive Split-Screen Workspace */}
      <main
        id="workspace"
        className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 max-w-[1600px] w-full mx-auto items-stretch"
      >
        <InputPanel
          language={language}
          onLanguageChange={setLanguage}
          explanationLanguage={explanationLanguage}
          onExplanationLanguageChange={setExplanationLanguage}
          code={code}
          onCodeChange={setCode}
          contextNote={contextNote}
          onContextNoteChange={setContextNote}
          uploadedImage={uploadedImage}
          onImageChange={setUploadedImage}
          onLoadBuggyC={handleLoadBuggyC}
          onLoadBuggyJava={handleLoadBuggyJava}
          onClearEditor={handleClearEditor}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          bannerMessage={bannerMessage}
          onDismissBanner={() => setBannerMessage(null)}
        />

        <ResultsPanel
          originalCode={code}
          result={result}
          isAnalyzing={isAnalyzing}
        />
      </main>

      {/* Collapsible History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={historySessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectHistorySession}
        onDeleteSession={handleDeleteHistorySession}
        onClearAll={handleClearAllHistory}
      />
    </div>
  );
}
