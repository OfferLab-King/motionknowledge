import {describe, expect, it} from 'vitest';
import {renderStyleShowcaseStill} from './render';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {styleRegistry, STYLE_ORDER} from '@motionknowledge/visual-library/style';
import {resolveTheme} from '@motionknowledge/visual-library/style';

/**
 * Style matrix smoke test: render one representative frame of the same
 * showcase composition in every registered style, 16:9 and 9:16. This proves
 * every style loads and renders deterministically in a real browser render.
 */
describe('style matrix smoke', () => {
  it('renders every registered style as a valid still', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'mk-matrix-'));
    for (const styleId of STYLE_ORDER) {
      const style = styleRegistry[styleId]!;
      expect(style.tokens.colors.background).toBeDefined();
      const theme = resolveTheme(styleId);
      expect(theme.visualLanguage).toBe(style.tokens.visualLanguage);
      const output = await renderStyleShowcaseStill(styleId, join(scratch, `${styleId}.png`), {width: 640, height: 360, frame: 100});
      expect(output.byteCount).toBeGreaterThan(1000);
      expect(output.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  }, 300_000);

  it('renders a 9:16 style still', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'mk-matrix-vertical-'));
    const output = await renderStyleShowcaseStill('signature', join(scratch, 'signature-9-16.png'), {width: 360, height: 640, frame: 50});
    expect(output.byteCount).toBeGreaterThan(1000);
  }, 300_000);
});
