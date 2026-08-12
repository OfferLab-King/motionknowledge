import {describe, expect, it} from 'vitest';
import {brand} from './brand';

describe('brand configuration', () => {
  it('exposes replaceable public identity', () => {
    expect(brand).toMatchObject({
      productName: 'MotionKnowledge',
      domain: 'motionknowledge.com',
      defaultTheme: 'professional',
    });
    expect(brand.supportEmail).toContain('@motionknowledge.com');
  });
});
