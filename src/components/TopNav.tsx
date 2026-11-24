import React from 'react';
import { Code2, History } from 'lucide-react';

interface TopNavProps {
  historyCount: number;
  onOpenHistory: () => void;
  onLoadBuggyC: () => void;
  onLoadBuggyJava: () => void;
  onLoadCleanC: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  historyCount,
  onOpenHistory,
  onLoadBuggyC,
  onLoadBuggyJava,
  onLoadCleanC,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#161b22] border-b border-[#30363d]">
      {/* Zone 1: Brand Title */}
      <a
        href="#workspace"
        className="flex items-center gap-2.5 text-base font-bold tracking-tight text-[#e6edf3] whitespace-nowrap shrink-0"
      >
        <Code2 className="w-5 h-5 text-[#2f81f7] shrink-0" aria-hidden="true" />
        <span>C &amp; Java Code Debugger</span>
      </a>

      {/* Zone 2: Concise single-line navigation links */}
      <nav
        aria-label="Quick Actions"
        className="hidden md:flex items-center gap-6 text-xs font-medium text-[#8b949e]"
      >
        <button
          type="button"
          onClick={onLoadBuggyC}
          className="hover:text-[#e6edf3] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          C Sample
        </button>
        <button
          type="button"
          onClick={onLoadBuggyJava}
          className="hover:text-[#e6edf3] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Java Sample
        </button>
        <button
          type="button"
          onClick={onLoadCleanC}
          className="hover:text-[#e6edf3] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Clean Code Check
        </button>
        <button
          type="button"
          onClick={onOpenHistory}
          className="hover:text-[#e6edf3] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Saved Sessions
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action (History Button) */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenHistory}
          aria-label="Open debugging history drawer"
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#e6edf3] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-[#2f81f7]" aria-hidden="true" />
          <span>History ({historyCount})</span>
        </button>
      </div>
    </header>
  );
};
