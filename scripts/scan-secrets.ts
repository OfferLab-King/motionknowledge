/**
 * Lightweight secret scanner: fails if common credential patterns appear in
 * tracked files. Run in CI before builds. This is a guard, not a guarantee —
 * real secrets are caught by review + rotation.
 * Usage: pnpm tsx scripts/scan-secrets.ts
 */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

const PATTERNS: Array<[string, RegExp]> = [
  ['private-key', /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['openai-key', /\bsk-[A-Za-z0-9]{20,}\b/],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['generic-assignment', /(api[_-]?key|secret|password)\s*[:=]\s*['"][A-Za-z0-9\/+]{24,}['"]/i],
];

const IGNORED_PATHS = /(^|\/)(\.git\/|node_modules\/|\.next\/|\.turbo\/|var\/|pnpm-lock\.yaml|package-lock\.json|test-results\/)/;

async function main(): Promise<void> {
  const {stdout} = await execFileAsync('git', ['ls-files', '-z']);
  const files = stdout.split('\0').filter(Boolean);
  const violations: Array<{file: string; pattern: string; line: number}> = [];
  for (const file of files) {
    if (IGNORED_PATHS.test(file)) continue;
    const content = await execFileAsync('git', ['show', `:${file}`]).then((result) => result.stdout);
    const lines = content.split('\n');
    for (const [name, pattern] of PATTERNS) {
      for (let index = 0; index < lines.length; index++) {
        if (pattern.test(lines[index]!)) {
          violations.push({file, pattern: name, line: index + 1});
        }
      }
    }
  }
  if (violations.length > 0) {
    console.error('Secret scan failed:');
    for (const violation of violations) {
      console.error(`  ${violation.file}:${violation.line} (${violation.pattern})`);
    }
    process.exit(1);
  }
  console.log(`Secret scan clean: ${files.length} tracked files checked.`);
}

main().catch((error) => {
  console.error('scan-secrets failed', error);
  process.exit(1);
});
