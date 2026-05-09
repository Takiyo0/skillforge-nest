/**
 * Supported programming languages for courses and code exercises.
 * These match the Piston API language identifiers.
 */
export const SUPPORTED_CODE_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'gcc', // C
  'cpp', // C++
  'rust',
  'go',
  'ruby',
  'php',
] as const;

export type CodeLanguage = (typeof SUPPORTED_CODE_LANGUAGES)[number];

/**
 * Human-readable names for languages
 */
export const CODE_LANGUAGE_NAMES: Record<CodeLanguage, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  gcc: 'C',
  cpp: 'C++',
  rust: 'Rust',
  go: 'Go',
  ruby: 'Ruby',
  php: 'PHP',
};

/**
 * Normalize input language to supported code language
 */
export function normalizeCodeLanguage(input: string): CodeLanguage | null {
  const lower = String(input || '').toLowerCase();
  const languageMap: Record<string, CodeLanguage> = {
    javascript: 'javascript',
    js: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
    python: 'python',
    py: 'python',
    java: 'java',
    c: 'gcc',
    gcc: 'gcc',
    cpp: 'cpp',
    'c++': 'cpp',
    rust: 'rust',
    go: 'go',
    golang: 'go',
    ruby: 'ruby',
    php: 'php',
  };

  return languageMap[lower] || null;
}

/**
 * Validate if a language is supported
 */
export function isValidCodeLanguage(language: string): boolean {
  return normalizeCodeLanguage(language) !== null;
}
