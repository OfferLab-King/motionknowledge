import {join} from 'node:path';
import {localStorageRoot as storageRoot, localExportRoot as exportRoot} from '@motionknowledge/storage';

export const localStorageRoot = storageRoot;
export const localExportRoot = exportRoot;
export const repoRoot = join(storageRoot, '..', '..');

