import {describe, expect, it} from 'vitest';
import {listFormats, getFormat, isRegisteredFormat, formatGrammarForPrompt} from './formats';
import {listTemplates, getTemplate, validateTemplateRegistry, templateFormat} from './templates';

describe('format registry', () => {
  it('registers all six formats with planning grammars', () => {
    expect(listFormats().map((format) => format.id)).toEqual([
      'explainer',
      'tutorial',
      'course-lesson',
      'business-analysis',
      'list-breakdown',
      'story-narrative',
    ]);
    for (const format of listFormats()) {
      expect(format.storyStructure.length).toBeGreaterThanOrEqual(3);
      for (const role of format.storyStructure) {
        expect(role.step.length).toBeGreaterThan(0);
        expect(role.intent.length).toBeGreaterThan(0);
        expect(role.guidance.length).toBeGreaterThan(0);
      }
    }
  });

  it('produces prompt grammar text from a format', () => {
    const grammar = formatGrammarForPrompt('tutorial');
    expect(grammar).toContain('Format: Tutorial');
    expect(grammar).toContain('Outcome');
    expect(grammar).toContain('Common mistake');
    expect(formatGrammarForPrompt('nope')).toBe('');
  });
});

describe('template registry', () => {
  it('registers all eight templates', () => {
    const templates = listTemplates();
    expect(templates.map((template) => template.id)).toEqual([
      'modern-explainer',
      'whiteboard-teacher',
      'clean-slide-lesson',
      'business-briefing',
      'editorial-breakdown',
      'minimal-concept',
      'quick-social-explainer',
      'worked-example-lesson',
    ]);
    for (const template of templates) {
      expect(template.description.length).toBeGreaterThan(10);
      expect(template.bestFor.length).toBeGreaterThan(0);
      expect(template.defaultDurationSeconds).toBeGreaterThan(0);
    }
  });

  it('maps every template to a registered format and style', () => {
    const errors = validateTemplateRegistry(['signature', 'handwritten', 'presentation', 'editorial', 'business', 'minimal']);
    expect(errors).toEqual([]);
  });

  it('resolves a template to its recommended format', () => {
    const template = getTemplate('whiteboard-teacher')!;
    expect(template.defaultStyleId).toBe('handwritten');
    expect(templateFormat(template)!.id).toBe('tutorial');
    const business = getTemplate('business-briefing')!;
    expect(business.recommendedFormat).toBe('business-analysis');
    expect(templateFormat(business)!.name).toBe('Business / Professional Analysis');
  });

  it('supports template-to-style switching without locking content', () => {
    const template = getTemplate('clean-slide-lesson')!;
    expect(template.defaultStyleId).toBe('presentation');
    // A user can pick any registered style later; the template is only a default.
    expect(isRegisteredFormat(template.recommendedFormat)).toBe(true);
    expect(getFormat('nope')).toBeUndefined();
  });
});
