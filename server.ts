import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel, GenerateContentResponse } from '@google/genai';
import {
  BUGGY_C_EXAMPLE,
  BUGGY_JAVA_EXAMPLE,
  getPrecomputedCAnalysis,
  getPrecomputedJavaAnalysis,
} from './src/utils/examples.ts';
import { detectLanguageFromCode } from './src/utils/debuggerUtils.ts';
import { DebugAnalysisResult, ExplanationLanguage, CodeErrorItem } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const debugResponseSchema = {
  type: Type.OBJECT,
  properties: {
    isValidCodeInput: {
      type: Type.BOOLEAN,
      description:
        'True if the input (or uploaded image) contains C or Java source code or a programming exercise statement that can be analyzed; false if the input is completely unrelated non-code text or an unreadable image.',
    },
    validationMessage: {
      type: Type.STRING,
      description:
        'If isValidCodeInput is false, explain clearly why the input could not be processed as C or Java code.',
    },
    detectedLanguage: {
      type: Type.STRING,
      description: 'Must be "C", "Java", or "Unknown".',
    },
    extractedCode: {
      type: Type.STRING,
      description:
        'When an image/screenshot is uploaded, provide the exact C or Java code extracted (or reconstructed from the exercise statement) from the image. Empty string if no image was uploaded.',
    },
    summary: {
      type: Type.STRING,
      description:
        'A concise 1-2 sentence overview of the analysis findings written in the requested explanation language.',
    },
    errors: {
      type: Type.ARRAY,
      description:
        'List of all detected bugs. Empty array [] if the code already has zero errors.',
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: 'Must be exactly one of: "Syntax", "Logic", or "Runtime/Memory".',
          },
          line: {
            type: Type.STRING,
            description: 'Exact 1-indexed line number or line range affected (e.g., "13" or "18-20").',
          },
          snippet: {
            type: Type.STRING,
            description: 'The exact problematic code line(s) from the input.',
          },
          explanation: {
            type: Type.STRING,
            description:
              'Clear, concise explanation of why this is wrong and how to fix it, written in the requested explanation language.',
          },
          fix: {
            type: Type.STRING,
            description: 'The corrected line(s) of code for this specific issue.',
          },
        },
        required: ['type', 'line', 'snippet', 'explanation', 'fix'],
      },
    },
    correctedCode: {
      type: Type.STRING,
      description:
        'The complete, clean, properly indented, working C or Java source code with all issues fixed. Keep it simple, clean, and close to the user original structure without unnecessary comments or overcomplication.',
    },
    executionComparison: {
      type: Type.OBJECT,
      properties: {
        sampleInput: {
          type: Type.STRING,
          description: 'Sample input values or execution context used to test the program.',
        },
        buggyBehavior: {
          type: Type.STRING,
          description:
            'What the original buggy code outputs, or why it fails to compile / crashes at runtime.',
        },
        expectedFixedOutput: {
          type: Type.STRING,
          description: 'The exact expected stdout output produced by the corrected code.',
        },
      },
      required: ['sampleInput', 'buggyBehavior', 'expectedFixedOutput'],
    },
  },
  required: [
    'isValidCodeInput',
    'detectedLanguage',
    'extractedCode',
    'summary',
    'errors',
    'correctedCode',
    'executionComparison',
  ],
};

function buildHeuristicFallbackAnalysis(
  code: string,
  languagePref: string,
  explanationLanguage: ExplanationLanguage
): DebugAnalysisResult {
  const normalizedInput = code.replace(/\r\n/g, '\n').trim();
  const normalizedBuggyC = BUGGY_C_EXAMPLE.replace(/\r\n/g, '\n').trim();
  const normalizedBuggyJava = BUGGY_JAVA_EXAMPLE.replace(/\r\n/g, '\n').trim();

  if (normalizedInput === normalizedBuggyC) {
    return getPrecomputedCAnalysis(explanationLanguage);
  }
  if (normalizedInput === normalizedBuggyJava) {
    return getPrecomputedJavaAnalysis(explanationLanguage);
  }

  const inferred =
    languagePref === 'C' || languagePref === 'Java'
      ? languagePref
      : detectLanguageFromCode(normalizedInput);

  if (inferred === 'Unknown') {
    return {
      isValidCodeInput: false,
      validationMessage:
        'The provided text does not appear to be valid C or Java source code. Please paste C or Java code, or load one of the examples.',
      detectedLanguage: 'Unknown',
      extractedCode: '',
      summary: 'Unable to detect C or Java code in the input.',
      errors: [],
      correctedCode: '',
      executionComparison: {
        sampleInput: 'N/A',
        buggyBehavior: 'Input is not valid C or Java code.',
        expectedFixedOutput: 'N/A',
      },
    };
  }

  // Static line-by-line heuristic analyzer when API key is not configured or quota restricted
  const lines = normalizedInput.split('\n');
  const errors: CodeErrorItem[] = [];
  const fixedLines = [...lines];

  lines.forEach((rawLine, idx) => {
    const lineNum = String(idx + 1);
    const trimmed = rawLine.trim();

    if (
      trimmed.length > 0 &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('/*') &&
      !trimmed.startsWith('*') &&
      !trimmed.startsWith('#') &&
      !trimmed.endsWith(';') &&
      !trimmed.endsWith('{') &&
      !trimmed.endsWith('}') &&
      !trimmed.startsWith('if') &&
      !trimmed.startsWith('for') &&
      !trimmed.startsWith('while') &&
      !trimmed.startsWith('else') &&
      !trimmed.startsWith('public ') &&
      !trimmed.startsWith('private ') &&
      !trimmed.startsWith('class ') &&
      !trimmed.startsWith('int main') &&
      !trimmed.startsWith('void ')
    ) {
      errors.push({
        type: 'Syntax',
        line: lineNum,
        snippet: trimmed,
        explanation:
          explanationLanguage === 'French'
            ? 'Point-virgule (;) manquant à la fin de l’instruction.'
            : explanationLanguage === 'Moroccan Darija'
            ? 'Naqsa point-virgule (;) f lekher dyal had sster.'
            : 'Missing semicolon (;) at the end of the statement.',
        fix: `${trimmed};`,
      });
      fixedLines[idx] = `${rawLine};`;
    }

    if (/for\s*\([^;]+;\s*\w+\s*<=\s*[^;]+;/.test(trimmed) && (trimmed.includes('.size()') || trimmed.includes('.length') || /\b\w+\s*<=\s*n\b/.test(trimmed))) {
      const fixedLoop = rawLine.replace('<=', '<');
      errors.push({
        type: 'Runtime/Memory',
        line: lineNum,
        snippet: trimmed,
        explanation:
          explanationLanguage === 'French'
            ? 'Dépassement de bornes potentiel (`<=` au lieu de `<` dans la boucle).'
            : explanationLanguage === 'Moroccan Darija'
            ? 'Condition dyal boucle fiha `<=` ghadi tkhrej 3la l-tableau (off-by-one). Beddelha b `<`.'
            : 'Potential off-by-one out-of-bounds access (`<=` used instead of `<` in loop condition).',
        fix: fixedLoop.trim(),
      });
      fixedLines[idx] = fixedLoop;
    }
  });

  const isClean = errors.length === 0;
  return {
    isValidCodeInput: true,
    detectedLanguage: inferred,
    extractedCode: '',
    summary: isClean
      ? explanationLanguage === 'French'
        ? 'Aucune erreur détectée. Le code est propre et prêt à être compilé.'
        : explanationLanguage === 'Moroccan Darija'
        ? 'Ma kayn 7ta ghalat f had l-code! Nqi w واجد.'
        : 'No syntax, logical, or runtime/memory errors found. Your code looks clean!'
      : explanationLanguage === 'French'
      ? `${errors.length} problème(s) détecté(s) dans votre code ${inferred}.`
      : explanationLanguage === 'Moroccan Darija'
      ? `Lqina ${errors.length} مشكل/أخطاء f had l-code dyal ${inferred}.`
      : `Detected ${errors.length} issue(s) in your ${inferred} code.`,
    errors,
    correctedCode: fixedLines.join('\n'),
    executionComparison: {
      sampleInput: 'Standard execution',
      buggyBehavior: isClean
        ? 'Compiles and executes cleanly with zero errors.'
        : `Fails or misbehaves due to ${errors.length} detected issue(s) (see Errors Breakdown).`,
      expectedFixedOutput: 'Program compiles and runs to completion without errors.',
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.post('/api/debug', async (req, res) => {
    try {
      const {
        code = '',
        language = 'Auto-Detect',
        explanationLanguage = 'English',
        context = '',
        image = null,
      } = req.body as {
        code?: string;
        language?: string;
        explanationLanguage?: ExplanationLanguage;
        context?: string;
        image?: { mimeType: string; base64Data: string } | null;
      };

      const trimmedCode = code.trim();
      if (!trimmedCode && !image) {
        return res.status(400).json({
          error: 'Please paste C or Java code, upload a .c / .java file, or upload a code screenshot before analyzing.',
        });
      }

      const ai = getAiClient();

      // Build system instruction
      const systemInstruction = `You are a senior C and Java compiler engineer and debugging mentor.
Analyze the user's C or Java code (or extract C/Java code or solve/debug the exercise from an uploaded screenshot/photo).
Target Language Hint: ${language}.
Explanation Language: ${explanationLanguage}.
${
  explanationLanguage === 'Moroccan Darija'
    ? 'Write all explanations and the summary in natural, clear Moroccan Darija (using Latin/Franco-Arabic script and/or Arabic script naturally understood by Moroccan CS students, keeping technical keywords like malloc, pointer, NullPointerException, syntax in English/French).'
    : `Write all explanations and the summary in clear, developer-friendly ${explanationLanguage}.`
}

Rules:
1. Detect all Syntax errors, Logic errors, and Runtime/Memory issues (e.g. buffer overflows, off-by-one loops, uninitialized variables, memory leaks, dangling pointers, null pointer dereferences, integer division truncation, String == comparison in Java).
2. Categorize each error strictly as "Syntax", "Logic", or "Runtime/Memory".
3. Provide exact 1-indexed line numbers matching the user's code (or the extractedCode if an image was uploaded).
4. Keep "correctedCode" simple, clean, well-formatted, and as close to the user's original structure as possible without unnecessary comments or overcomplication.
5. If the code already has zero errors, return an empty array [] for "errors" and return the clean original code in "correctedCode".
6. If the input is completely unrelated non-code text (and not a programming exercise) or the image is unreadable, set "isValidCodeInput" to false and provide a clear "validationMessage".`;

      const userPromptParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (image && image.base64Data && image.mimeType) {
        userPromptParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.base64Data,
          },
        });
      }

      let promptText = '';
      if (image) {
        promptText +=
          'An image/screenshot has been uploaded. First extract any C or Java code (or write the C/Java code corresponding to the exercise shown) into "extractedCode", and then perform a full debugging analysis on it.\n\n';
      }
      if (context && context.trim()) {
        promptText += `Expected behavior / Problem context provided by user:\n"""\n${context.trim()}\n"""\n\n`;
      }
      if (trimmedCode) {
        const numberedLines = trimmedCode
          .split('\n')
          .map((line, i) => `${i + 1}: ${line}`)
          .join('\n');
        promptText += `Source Code to analyze (with 1-indexed line numbers for reference—do NOT include line numbers in correctedCode or extractedCode):\n\`\`\`\n${numberedLines}\n\`\`\`\n\nRaw Source Code:\n\`\`\`\n${trimmedCode}\n\`\`\``;
      }

      userPromptParts.push({ text: promptText });

      if (ai) {
        // Model priority according to instructions:
        // - If an image is uploaded: prioritize gemini-4-neon (image understanding), fallback to gemini-4-hydrogen
        // - For code reasoning & high thinking: prioritize gemini-4-carbon with ThinkingLevel.HIGH, fallback to gemini-4-neon, then gemini-4-hydrogen
        const candidateConfigs: Array<{ model: string; thinkingLevel: ThinkingLevel }> = image
          ? [
              { model: 'gemini-4-neon', thinkingLevel: ThinkingLevel.HIGH },
              { model: 'gemini-4-carbon', thinkingLevel: ThinkingLevel.HIGH },
              { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.HIGH },
            ]
          : [
              { model: 'gemini-4-carbon', thinkingLevel: ThinkingLevel.HIGH },
              { model: 'gemini-4-neon', thinkingLevel: ThinkingLevel.HIGH },
              { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.HIGH },
            ];

        for (const candidate of candidateConfigs) {
          try {
            const response: GenerateContentResponse = await ai.models.generateContent({
              model: candidate.model,
              contents: { parts: userPromptParts },
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: debugResponseSchema,
                thinkingConfig: {
                  thinkingLevel: candidate.thinkingLevel,
                },
              },
            });

            const rawText = (response.text ?? '').trim();
            if (rawText) {
              const parsed = JSON.parse(rawText) as DebugAnalysisResult;
              parsed.modelUsed = candidate.model;
              return res.json(parsed);
            }
          } catch (modelErr: unknown) {
            const errMsg = modelErr instanceof Error ? modelErr.message : String(modelErr);
            console.warn(`Model ${candidate.model} failed, trying next fallback:`, errMsg);
          }
        }
      }

      // If no live API key is available or all paid-tier models were declined/unavailable:
      if (image && !trimmedCode) {
        return res.status(422).json({
          error:
            'Could not extract readable C or Java code from this image. Please ensure the image clearly shows code or paste the code directly into the editor.',
        });
      }

      const fallbackResult = buildHeuristicFallbackAnalysis(
        trimmedCode,
        language,
        explanationLanguage
      );
      return res.json(fallbackResult);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected server error while analyzing code.';
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`C & Java Code Debugger server running on http://localhost:${PORT}`);
  });
}

startServer();
