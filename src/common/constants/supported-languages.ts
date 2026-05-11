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

export const CODE_LANGUAGE_BASE_CODE: Record<CodeLanguage, string> = {
  javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim();

function solve(input) {
  // Write your logic here
  return input;
}

const output = solve(input);
if (output !== undefined) {
  process.stdout.write(String(output));
}
`,
  typescript: `import * as fs from 'fs';
const input = fs.readFileSync(0, 'utf8').trim();

function solve(input: string): string {
  // Write your logic here
  return input;
}

const output = solve(input);
if (output !== undefined) {
  process.stdout.write(String(output));
}
`,
  python: `import sys

def solve(input_data: str) -> str:
    # Write your logic here
    return input_data

input_data = sys.stdin.read().strip()
result = solve(input_data)
if result is not None:
    print(result)
`,
  java: `import java.io.BufferedReader;
import java.io.InputStreamReader;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            sb.append(line).append("\\n");
        }
        String input = sb.toString().trim();
        System.out.print(solve(input));
    }

    static String solve(String input) {
        // Write your logic here
        return input;
    }
}
`,
  gcc: `#include <stdio.h>

int main(void) {
    // Write your logic here
    return 0;
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Write your logic here
    return 0;
}
`,
  rust: `use std::io::{self, Read};

fn solve(input: &str) -> String {
    // Write your logic here
    input.to_string()
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let output = solve(input.trim());
    print!("{}", output);
}
`,
  go: `package main

import (
	"fmt"
	"io"
	"os"
	"strings"
)

func solve(input string) string {
	// Write your logic here
	return input
}

func main() {
	data, _ := io.ReadAll(os.Stdin)
	input := strings.TrimSpace(string(data))
	fmt.Print(solve(input))
}
`,
  ruby: `input = STDIN.read.strip

def solve(input)
  # Write your logic here
  input
end

print solve(input)
`,
  php: `<?php
$input = trim(stream_get_contents(STDIN));

function solve(string $input): string {
    // Write your logic here
    return $input;
}

echo solve($input);
`,
};
