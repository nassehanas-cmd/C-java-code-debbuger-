import React, { useRef, useState } from 'react';
import {
  FileCode2,
  Image as ImageIcon,
  Play,
  Loader2,
  Trash2,
  X,
  AlertCircle,
  Globe,
  Sparkles,
} from 'lucide-react';
import { CodeLanguage, ExplanationLanguage, UploadedImageState } from '../types';
import { detectLanguageFromFilename } from '../utils/debuggerUtils';

interface InputPanelProps {
  language: CodeLanguage;
  onLanguageChange: (lang: CodeLanguage) => void;
  explanationLanguage: ExplanationLanguage;
  onExplanationLanguageChange: (lang: ExplanationLanguage) => void;
  code: string;
  onCodeChange: (code: string) => void;
  contextNote: string;
  onContextNoteChange: (note: string) => void;
  uploadedImage: UploadedImageState | null;
  onImageChange: (image: UploadedImageState | null) => void;
  onLoadBuggyC: () => void;
  onLoadBuggyJava: () => void;
  onClearEditor: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  bannerMessage: { type: 'error' | 'info'; text: string } | null;
  onDismissBanner: () => void;
}

const LANGUAGES: CodeLanguage[] = ['C', 'Java', 'Auto-Detect'];
const EXPLANATION_LANGUAGES: ExplanationLanguage[] = [
  'English',
  'French',
  'Moroccan Darija',
];

export const InputPanel: React.FC<InputPanelProps> = ({
  language,
  onLanguageChange,
  explanationLanguage,
  onExplanationLanguageChange,
  code,
  onCodeChange,
  contextNote,
  onContextNoteChange,
  uploadedImage,
  onImageChange,
  onLoadBuggyC,
  onLoadBuggyJava,
  onClearEditor,
  onAnalyze,
  isAnalyzing,
  bannerMessage,
  onDismissBanner,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [localAlert, setLocalAlert] = useState<string | null>(null);

  const lineCount = Math.max(1, code.split('\n').length);
  const lineNumbers = Array.from({ length: lineCount }, (_, idx) => idx + 1);

  const handleEditorScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const processSourceFile = (file: File) => {
    setLocalAlert(null);
    const info = detectLanguageFromFilename(file.name);
    if (!info.supported) {
      setLocalAlert(
        `Unsupported file extension "${info.extension || file.name}". Please upload a .c, .java, or .txt source file.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = typeof e.target?.result === 'string' ? e.target.result : '';
      onCodeChange(content);
      if (info.language === 'C' || info.language === 'Java') {
        onLanguageChange(info.language);
      }
    };
    reader.onerror = () => {
      setLocalAlert(`Failed to read file "${file.name}".`);
    };
    reader.readAsText(file);
  };

  const processImageFile = (file: File) => {
    setLocalAlert(null);
    if (!file.type.startsWith('image/')) {
      setLocalAlert(
        `Unsupported image format "${file.name}". Please upload a PNG, JPG, or WEBP screenshot/photo.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = typeof e.target?.result === 'string' ? e.target.result : '';
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx === -1) {
        setLocalAlert('Could not parse image data.');
        return;
      }
      const base64Data = dataUrl.slice(commaIdx + 1);
      onImageChange({
        name: file.name,
        mimeType: file.type,
        base64Data,
        dataUrl,
      });
    };
    reader.onerror = () => {
      setLocalAlert(`Failed to read image "${file.name}".`);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      processImageFile(file);
    } else {
      processSourceFile(file);
    }
  };

  const activeAlert =
    localAlert || (bannerMessage?.type === 'error' ? bannerMessage.text : null);

  return (
    <section
      aria-label="Source Code Input Panel"
      className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden h-full"
    >
      {/* Top Toolbar: Language Selector & Explanation Language Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0d1117]/60 border-b border-[#30363d]">
        {/* 1. Language Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#8b949e]">Language:</span>
          <div
            role="group"
            aria-label="Programming Language Selector"
            className="flex items-center gap-1 p-1 bg-[#0d1117] border border-[#30363d] rounded-lg"
          >
            {LANGUAGES.map((item) => {
              const active = language === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onLanguageChange(item)}
                  aria-pressed={active}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#2f81f7] text-white'
                      : 'text-[#8b949e] hover:text-[#e6edf3]'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Explanation Language Selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="explanation-lang-select"
            className="flex items-center gap-1.5 text-xs font-medium text-[#8b949e] whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5 text-[#58a6ff]" aria-hidden="true" />
            <span>Explanations:</span>
          </label>
          <select
            id="explanation-lang-select"
            value={explanationLanguage}
            onChange={(e) =>
              onExplanationLanguageChange(e.target.value as ExplanationLanguage)
            }
            className="px-2.5 py-1.5 text-xs font-medium text-[#e6edf3] bg-[#0d1117] border border-[#30363d] rounded-lg focus:outline-none focus:border-[#2f81f7] cursor-pointer"
          >
            {EXPLANATION_LANGUAGES.map((expLang) => (
              <option key={expLang} value={expLang}>
                {expLang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. File & Image Import Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".c,.h,.java,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processSourceFile(file);
              e.target.value = '';
            }}
            className="hidden"
            aria-label="Upload C or Java source file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#e6edf3] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5 text-[#58a6ff]" aria-hidden="true" />
            <span>Upload File (.c / .java)</span>
          </button>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file);
              e.target.value = '';
            }}
            className="hidden"
            aria-label="Upload screenshot or photo of code"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#e6edf3] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#a371f7]" aria-hidden="true" />
            <span>Upload Screenshot / Photo</span>
          </button>
        </div>

        {/* Quick-load examples & Clear */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setLocalAlert(null);
              onLoadBuggyC();
            }}
            className="px-2.5 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Load Buggy C Example
          </button>
          <button
            type="button"
            onClick={() => {
              setLocalAlert(null);
              onLoadBuggyJava();
            }}
            className="px-2.5 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Load Buggy Java Example
          </button>
          <button
            type="button"
            onClick={() => {
              setLocalAlert(null);
              onClearEditor();
            }}
            aria-label="Clear code editor"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#8b949e] hover:text-[#f85149] bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Uploaded Screenshot Thumbnail Preview */}
      {uploadedImage && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#1c2128] border-b border-[#30363d]">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={uploadedImage.dataUrl}
              alt={`Uploaded preview of ${uploadedImage.name}`}
              referrerPolicy="no-referrer"
              className="w-11 h-11 object-cover rounded border border-[#484f58] shrink-0 bg-[#0d1117]"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#e6edf3] truncate">
                {uploadedImage.name}
              </p>
              <p className="text-[11px] text-[#8b949e]">
                Gemini will extract code or exercise requirements from this image
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onImageChange(null)}
            aria-label="Remove uploaded image"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#f85149] hover:bg-[#f85149]/10 rounded-md transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        </div>
      )}

      {/* Alert / Validation Notification Banner */}
      {activeAlert && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#f85149]/15 border-b border-[#f85149]/40 text-[#ff7b72] text-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{activeAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocalAlert(null);
              onDismissBanner();
            }}
            aria-label="Dismiss notification"
            className="p-1 hover:bg-[#f85149]/20 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {bannerMessage && bannerMessage.type === 'info' && !localAlert && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 px-4 py-2 bg-[#2f81f7]/15 border-b border-[#2f81f7]/40 text-[#79c0ff] text-xs"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={onDismissBanner}
            aria-label="Dismiss info notification"
            className="p-1 hover:bg-[#2f81f7]/20 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Optional Context Field */}
      <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d]">
        <label
          htmlFor="expected-behavior-input"
          className="block text-xs font-medium text-[#8b949e] mb-1.5"
        >
          What is this code supposed to do? (Optional - helps catch logical errors)
        </label>
        <input
          id="expected-behavior-input"
          type="text"
          value={contextNote}
          onChange={(e) => onContextNoteChange(e.target.value)}
          placeholder="e.g., Calculate average of N numbers, sort a linked list, or paste exercise statement..."
          className="w-full px-3 py-1.5 text-xs text-[#e6edf3] placeholder-[#6e7681] bg-[#0d1117] border border-[#30363d] rounded-lg focus:outline-none focus:border-[#2f81f7]"
        />
      </div>

      {/* 5. Code Editor Area with Synchronized Line Numbers & Drag-and-Drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`relative flex-1 flex min-h-[340px] bg-[#0d1117] overflow-hidden ${
          isDraggingOver ? 'ring-2 ring-inset ring-[#2f81f7]' : ''
        }`}
      >
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-12 py-3 px-2 bg-[#0d1117] border-r border-[#21262d] text-right select-none overflow-hidden font-mono text-xs leading-6 text-[#6e7681] tabular-nums shrink-0"
        >
          {lineNumbers.map((num) => (
            <div key={num}>{num}</div>
          ))}
        </div>

        {/* Monospace Code Textarea */}
        <textarea
          ref={textareaRef}
          id="source-code-editor"
          aria-label="Source Code Editor"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          onScroll={handleEditorScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          placeholder="Paste your C or Java source code here, or drag and drop a .c / .java file or screenshot..."
          className="code-editor flex-1 w-full h-full p-3 bg-transparent text-[#e6edf3] placeholder-[#484f58] font-mono text-xs leading-6 resize-none focus:outline-none overflow-auto whitespace-pre"
        />

        {isDraggingOver && (
          <div className="absolute inset-0 bg-[#0d1117]/85 flex items-center justify-center pointer-events-none">
            <div className="px-5 py-3 rounded-lg bg-[#161b22] border border-[#2f81f7] text-xs font-medium text-[#58a6ff]">
              Drop .c, .java, .txt file or code screenshot here
            </div>
          </div>
        )}
      </div>

      {/* 6. Prominent Action Button */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[#161b22] border-t border-[#30363d]">
        <div className="text-xs text-[#8b949e] font-mono tabular-nums">
          <span>{lineCount} lines</span>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <span>{code.length} chars</span>
        </div>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#2f81f7] hover:bg-[#388bfd] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Analyzing &amp; Fixing Code...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>Analyze &amp; Fix Code</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
};
