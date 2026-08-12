import {existsSync} from 'node:fs';
import {join, dirname} from 'node:path';

export function resolveRepoRoot(startDir: string = process.cwd()): string {
  let current = startDir;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return startDir;
}

export const repoRoot = resolveRepoRoot();
export const localStorageRoot = join(repoRoot, 'var', 'storage');
export const localExportRoot = join(repoRoot, 'var', 'exports');
