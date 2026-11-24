import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLineDiff,
  summarizeErrorCounts,
  detectLanguageFromFilename,
  detectLanguageFromCode,
  prependHistorySession,
  createHistorySession,
} from './debuggerUtils';
import { CodeErrorItem, DebugAnalysisResult, HistorySession } from '../types';

test('computeLineDiff identifies removed, added, and unchanged lines accurately', () => {
  const before = `int a = 1;\nint b = 2\nreturn a;`;
  const after = `int a = 1;\nint b = 2;\nreturn a + b;`;

  const diff = computeLineDiff(before, after);
  const equalLines = diff.filter((d) => d.type === 'equal');
  const removedLines = diff.filter((d) => d.type === 'remove');
  const addedLines = diff.filter((d) => d.type === 'add');

  assert.equal(equalLines.length, 1);
  assert.equal(equalLines[0].content, 'int a = 1;');
  assert.equal(removedLines.length, 2);
  assert.equal(addedLines.length, 2);
});

test('summarizeErrorCounts tallies Syntax, Logic, and Runtime/Memory accurately', () => {
  const errors: CodeErrorItem[] = [
    { type: 'Syntax', line: '4', snippet: 'int x = 5', explanation: 'Missing ;', fix: 'int x = 5;' },
    { type: 'Logic', line: '8', snippet: 'a / b', explanation: 'Integer division', fix: '(float)a / b' },
    { type: 'Runtime/Memory', line: '10', snippet: 'arr[10]', explanation: 'OOB', fix: 'arr[9]' },
    { type: 'Runtime/Memory', line: '14', snippet: 'return 0;', explanation: 'Leak', fix: 'free(arr);' },
  ];

  const counts = summarizeErrorCounts(errors);
  assert.equal(counts.syntax, 1);
  assert.equal(counts.logic, 1);
  assert.equal(counts.runtime, 2);
  assert.equal(counts.total, 4);
});

test('detectLanguageFromFilename detects .c, .java, .txt and rejects unsupported extensions', () => {
  assert.deepEqual(detectLanguageFromFilename('main.c'), {
    supported: true,
    language: 'C',
    extension: '.c',
  });
  assert.deepEqual(detectLanguageFromFilename('Solution.JAVA'), {
    supported: true,
    language: 'Java',
    extension: '.java',
  });
  assert.deepEqual(detectLanguageFromFilename('notes.txt'), {
    supported: true,
    language: 'Auto-Detect',
    extension: '.txt',
  });
  assert.equal(detectLanguageFromFilename('script.py').supported, false);
});

test('detectLanguageFromCode distinguishes C, Java, and non-code text', () => {
  assert.equal(detectLanguageFromCode('#include <stdio.h>\nint main() { printf("hi"); }'), 'C');
  assert.equal(
    detectLanguageFromCode('public class Main { public static void main(String[] args) { System.out.println("Hi"); } }'),
    'Java'
  );
  assert.equal(detectLanguageFromCode('Hello this is just a grocery list of apples and bananas'), 'Unknown');
});

test('prependHistorySession deduplicates by ID and enforces 20-session cap', () => {
  const dummyResult: DebugAnalysisResult = {
    isValidCodeInput: true,
    detectedLanguage: 'C',
    summary: 'Clean code',
    errors: [],
    correctedCode: 'int main() { return 0; }',
    executionComparison: {
      sampleInput: 'none',
      buggyBehavior: 'none',
      expectedFixedOutput: '0',
    },
  };

  let history: HistorySession[] = [];
  for (let i = 0; i < 25; i++) {
    const session = createHistorySession({
      id: `sess-${i}`,
      timestamp: 1000 + i,
      originalCode: `int main() { return ${i}; }`,
      explanationLanguage: 'English',
      result: dummyResult,
    });
    history = prependHistorySession(history, session);
  }

  assert.equal(history.length, 20);
  assert.equal(history[0].id, 'sess-24');
  assert.equal(history[19].id, 'sess-5');
});
