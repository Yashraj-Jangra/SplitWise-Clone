/**
 * SplitIt AI Assistant Guardrail System
 *
 * Implements a robust multi-layered safety and topic boundary enforcement:
 * - Layer 1: Server-side input intent classifier (blocks coding, jailbreaks, unsafe content, off-topic requests).
 * - Layer 2: Hardened system prompt constraints (embedded in chat route).
 * - Layer 3: Post-generation output scanner for code blocks or leaked instructions.
 */

import type { GuardrailBlockedReason } from '@/types/ai';

export interface GuardrailBlock {
  allowed: false;
  reason: GuardrailBlockedReason;
  refusalMessage: string;
}

export interface GuardrailAllow {
  allowed: true;
}

export type GuardrailResult = GuardrailBlock | GuardrailAllow;

export const REFUSAL_MESSAGES: Record<GuardrailBlockedReason, string> = {
  code_generation:
    "I'm designed exclusively to help with expense tracking, group balances, and general financial calculations. I cannot write, debug, or provide programming code.",
  injection:
    "I cannot modify my operational instructions, switch personas, or bypass safety policies. I'm here to help you manage your SplitIt expenses, balances, and shared bills.",
  unsafe:
    "I cannot assist with requests involving unauthorized access, fraud, security bypasses, or unsafe activities.",
};

// ── Regex Pattern Taxonomies ────────────────────────────────────────────────

export const GUARDRAIL_PATTERNS = {
  /**
   * Layer 1A: Prompt Injection & Jailbreak Attempts
   * Catches attempts to bypass instructions, switch personas (DAN), leak prompts, or override guidelines.
   */
  INJECTION: [
    /\b(ignore|disregard|forget|bypass|override)\b.*?\b(previous|prior|above|all|system|base)\b.*?\b(instructions?|prompts?|rules?|constraints?|guidelines?|policies)\b/i,
    /\b(you are now|act as|pretend (to be|you are)|roleplay as|switch to)\b.*?\b(dan|jailbreak|unrestricted|developer mode|god mode|evil|root|system admin|unfiltered|anarchy|chaos)\b/i,
    /\b(reveal|show|print|display|dump|leak|repeat)\b.*?\b(system prompt|system instructions?|hidden instructions?|internal prompt|instructions given to you|initial prompt|base prompt)\b/i,
    /\b(bypass|disable|turn off|ignore)\b.*?\b(safety|guardrails?|filters?|restrictions?|safeguards?|ethics|boundaries)\b/i,
    /\bdo anything now\b/i,
    /\bstart your response with\b.*?\b(DAN|jailbroken|unrestricted)\b/i,
  ],

  /**
   * Layer 1B: Unsafe, Malicious, Exploits, or Fraud
   * Catches hacking, credential theft, malware, illegal acts, and financial fraud.
   */
  UNSAFE: [
    /\b(hack|exploit|ddos|sql injection|xss|cross-site scripting|crack password|steal credentials|keylogger|phishing|malware|trojan|ransomware|zero-day|rootkit)\b/i,
    /\b(how to (make|build|synthesize|manufacture)\b.*?\b(bomb|weapon|explosive|meth|fentanyl|poison|bioweapon))\b/i,
    /\b(money laundering|evade taxes|tax evasion|commit fraud|fake invoice|fake receipt for tax|forge signature)\b/i,
    /\b(steal money from|bypass banking|counterfeit currency|dump credit cards)\b/i,
  ],

  /**
   * Layer 1C: Code Generation & Programming Tasks
   * Blocks requests to write, generate, debug, or convert code in any programming language.
   * Exempts natural drafting of reminder emails or splitting math questions.
   */
  CODE_GENERATION: [
    // Direct code generation requests
    /\b(write|generate|create|give me|show me|provide|implement|build|develop|compose)\b.*?\b(code|script|program|function|algorithm|class|api endpoint|hook|regex|sql query|macro|component)\b/i,
    // Language-specific coding prompts
    /\b(in|using|with)\b\s+(python|javascript|typescript|java|c\+\+|c#|golang|rust|ruby|php|swift|kotlin|sql|bash|powershell|html\/?css|react|vue|angular|node\.?js|dockerfile)\b.*?\b(write|create|script|code|function|program|app|loop|array|object)\b/i,
    /\b(write|create|script|code|function|program)\b.*?\b(in|using|with)\b\s+(python|javascript|typescript|java|c\+\+|c#|golang|rust|ruby|php|swift|kotlin|sql|bash|powershell|html|react)\b/i,
    // Direct code keywords
    /\b(write a python|write a js|write a typescript|write a bash|write a shell|write a sql|write an html|write a c\+\+)\b/i,
    // Coding task keywords
    /\b(debug this code|fix this bug in (my )?code|refactor this (function|class|code)|solve leetcode|write a regex for)\b/i,
    // Raw code snippet inputs asking for completion or execution
    /(console\.log\(|def\s+\w+\(|function\s+\w*\(|public\s+static\s+void|SELECT\s+.*FROM|<!DOCTYPE\s+html>|import\s+.*?from\s+['"]|export\s+default\s+function)/i,
  ],
} as const;

/**
 * Layer 1: Classifies incoming user input.
 * Blocks prompt injections, unsafe/malicious requests, and programming code generation.
 * General questions (recipes, trivia, conversational queries, math, etc.) are allowed.
 */
export function classifyInput(message: string): GuardrailResult {
  const trimmed = (message || '').trim();
  if (!trimmed) {
    return { allowed: true };
  }

  // 1. High Priority: Prompt Injection / Jailbreak Guard
  for (const pattern of GUARDRAIL_PATTERNS.INJECTION) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'injection',
        refusalMessage: REFUSAL_MESSAGES.injection,
      };
    }
  }

  // 2. High Priority: Malicious / Unsafe Activities Guard
  for (const pattern of GUARDRAIL_PATTERNS.UNSAFE) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'unsafe',
        refusalMessage: REFUSAL_MESSAGES.unsafe,
      };
    }
  }

  // 3. High Priority: Code Generation & Programming Guard
  for (const pattern of GUARDRAIL_PATTERNS.CODE_GENERATION) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'code_generation',
        refusalMessage: REFUSAL_MESSAGES.code_generation,
      };
    }
  }

  // 4. Query is valid within allowed scope (general queries, finances, math, etc. are allowed)
  return { allowed: true };
}

/**
 * Layer 3: Post-Generation Output Scanner.
 * Detects if the model inadvertently generated programming code blocks or disallowed structures.
 */
export function scanOutputForViolations(text: string): {
  hasViolation: boolean;
  sanitizedText: string;
  reason?: GuardrailBlockedReason;
} {
  if (!text) {
    return { hasViolation: false, sanitizedText: text };
  }

  // Check for markdown code blocks specifying programming languages
  const codeBlockRegex = /```(?:python|javascript|typescript|js|ts|jsx|tsx|java|c|cpp|csharp|go|rust|ruby|php|swift|kotlin|sql|bash|sh|powershell|html|css|yaml|json|dockerfile)[\s\S]*?```/i;

  if (codeBlockRegex.test(text)) {
    return {
      hasViolation: true,
      sanitizedText:
        "I'm designed exclusively to help with expense tracking, group balances, and financial calculations. I cannot provide programming code.",
      reason: 'code_generation',
    };
  }

  // Check for multi-line code blocks without language tags if they look like code
  const genericCodeBlockRegex = /```[\s\S]*?(?:function|def\s+|const\s+|let\s+|var\s+|import\s+|class\s+|SELECT\s+|return\s+)[\s\S]*?```/i;

  if (genericCodeBlockRegex.test(text)) {
    return {
      hasViolation: true,
      sanitizedText:
        "I'm designed exclusively to help with expense tracking, group balances, and financial calculations. I cannot provide programming code.",
      reason: 'code_generation',
    };
  }

  return { hasViolation: false, sanitizedText: text };
}
