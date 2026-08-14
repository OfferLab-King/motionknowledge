/**
 * Template gallery. A template is a curated starting point: recommended
 * format + default style + planning guidance. Users may change style or
 * format after creation; templates never lock content.
 */

import {getFormat, isRegisteredFormat, listFormats, type VideoFormat} from './formats';

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  recommendedFormat: string;
  defaultStyleId: string;
  aspectRatios: ReadonlyArray<'16:9' | '9:16'>;
  defaultDurationSeconds: number;
  introPattern: string;
  outroPattern: string;
  pacing: string;
  preferredVisualFamilies: string[];
  transitions: string;
  captionTreatment: string;
  voiceTone: string;
  thumbnailTreatment: string;
  scenePlanningGuidance: string;
}

export const videoTemplates: Readonly<Record<string, VideoTemplate>> = {
  'modern-explainer': {
    id: 'modern-explainer',
    name: 'Modern Explainer',
    description: 'Sleek motion graphics with smooth diagrams and springy reveals. The default MotionKnowledge look.',
    bestFor: ['concepts', 'technology', 'science', 'YouTube'],
    recommendedFormat: 'explainer',
    defaultStyleId: 'signature',
    aspectRatios: ['16:9', '9:16'],
    defaultDurationSeconds: 300,
    introPattern: 'Hook question on a polished title card, then the definition.',
    outroPattern: 'Key takeaway card with a follow-up question.',
    pacing: 'Balanced: ~20-25 seconds per scene, steady cadence.',
    preferredVisualFamilies: ['process-flow', 'comparison', 'line-chart', 'definition-card'],
    transitions: 'crossfade',
    captionTreatment: 'pill',
    voiceTone: 'confident, conversational, modern',
    thumbnailTreatment: 'dark gradient with teal accent title',
    scenePlanningGuidance: 'Follow the Explainer grammar; prefer one idea per scene.',
  },
  'whiteboard-teacher': {
    id: 'whiteboard-teacher',
    name: 'Whiteboard Teacher',
    description: 'Hand-drawn diagrams and progressive annotation. Best for teaching difficult concepts.',
    bestFor: ['tutorials', 'difficult concepts', 'teaching', 'courses'],
    recommendedFormat: 'tutorial',
    defaultStyleId: 'handwritten',
    aspectRatios: ['16:9', '9:16'],
    defaultDurationSeconds: 360,
    introPattern: 'Topic written on paper with a hand underline.',
    outroPattern: 'Sticky-note summary with the key takeaway.',
    pacing: 'Calm: draw each element as it is mentioned, ~25-30 seconds per scene.',
    preferredVisualFamilies: ['process-flow', 'definition-card', 'before-after', 'summary'],
    transitions: 'draw',
    captionTreatment: 'marker',
    voiceTone: 'warm, patient, encouraging',
    thumbnailTreatment: 'paper background with marker headline',
    scenePlanningGuidance: 'Prefer visuals that build up progressively; avoid dense charts.',
  },
  'clean-slide-lesson': {
    id: 'clean-slide-lesson',
    name: 'Clean Slide Lesson',
    description: 'Structured slide compositions with strong hierarchy. Premium corporate, not a static deck.',
    bestFor: ['business', 'training', 'corporate', 'courses'],
    recommendedFormat: 'course-lesson',
    defaultStyleId: 'presentation',
    aspectRatios: ['16:9', '9:16'],
    defaultDurationSeconds: 480,
    introPattern: 'Title slide with objectives list.',
    outroPattern: 'Summary slide recapping the objectives.',
    pacing: 'Structured: one slide-equivalent per scene, ~20 seconds each.',
    preferredVisualFamilies: ['section-intro', 'bullet-reveal', 'data-table', 'quiz-question'],
    transitions: 'slide',
    captionTreatment: 'pill',
    voiceTone: 'clear, professional, measured',
    thumbnailTreatment: 'title on white with blue accent bar',
    scenePlanningGuidance: 'Use the Course Lesson grammar; objectives → concept → check.',
  },
  'business-briefing': {
    id: 'business-briefing',
    name: 'Business Briefing',
    description: 'Charts, metrics and structured professional visuals. Best for finance and business.',
    bestFor: ['finance', 'economics', 'strategy', 'reports'],
    recommendedFormat: 'business-analysis',
    defaultStyleId: 'business',
    aspectRatios: ['16:9'],
    defaultDurationSeconds: 420,
    introPattern: 'Framing statement with the key metric on a KPI card.',
    outroPattern: 'Recommendation card with action items.',
    pacing: 'Dense but calm: metrics first, ~18 seconds per scene.',
    preferredVisualFamilies: ['data-table', 'bar-chart', 'cashflow-timeline', 'comparison', 'pros-cons'],
    transitions: 'crossfade',
    captionTreatment: 'pill',
    voiceTone: 'analytical, precise, understated',
    thumbnailTreatment: 'KPI card with headline number',
    scenePlanningGuidance: 'Prefer tables and charts over decorative scenes; keep figures sourced.',
  },
  'editorial-breakdown': {
    id: 'editorial-breakdown',
    name: 'Editorial Breakdown',
    description: 'Bold typography and infographic blocks for fact-heavy, shareable content.',
    bestFor: ['statistics', 'social media', 'news', 'YouTube'],
    recommendedFormat: 'list-breakdown',
    defaultStyleId: 'editorial',
    aspectRatios: ['16:9', '9:16'],
    defaultDurationSeconds: 240,
    introPattern: 'Bold headline with a big number.',
    outroPattern: 'Numbered recap list with strong blocks.',
    pacing: 'Punchy: ~15-18 seconds per scene, big reveals.',
    preferredVisualFamilies: ['number-counter', 'donut-chart', 'bar-chart', 'pyramid'],
    transitions: 'scale',
    captionTreatment: 'block',
    voiceTone: 'energetic, assertive, clear',
    thumbnailTreatment: 'accent block with bold headline',
    scenePlanningGuidance: 'One fact per scene; lead with the number.',
  },
  'minimal-concept': {
    id: 'minimal-concept',
    name: 'Minimal Concept',
    description: 'Substantial whitespace, large type and simple geometry. Maximum clarity, minimal decoration.',
    bestFor: ['philosophy', 'abstract concepts', 'accessible education'],
    recommendedFormat: 'explainer',
    defaultStyleId: 'minimal',
    aspectRatios: ['16:9', '9:16'],
    defaultDurationSeconds: 300,
    introPattern: 'Single sentence on white space.',
    outroPattern: 'One-line takeaway centered on white space.',
    pacing: 'Slow and deliberate: ~25-30 seconds per scene.',
    preferredVisualFamilies: ['title-hero', 'quote', 'definition-card', 'key-takeaway'],
    transitions: 'crossfade',
    captionTreatment: 'flat',
    voiceTone: 'calm, thoughtful, precise',
    thumbnailTreatment: 'white background with large type',
    scenePlanningGuidance: 'Fewer scenes, bigger ideas; avoid decoration.',
  },
  'quick-social-explainer': {
    id: 'quick-social-explainer',
    name: 'Quick Social Explainer',
    description: 'Short, punchy vertical explainers built for social feeds.',
    bestFor: ['TikTok', 'Reels', 'Shorts', 'social'],
    recommendedFormat: 'explainer',
    defaultStyleId: 'editorial',
    aspectRatios: ['9:16'],
    defaultDurationSeconds: 90,
    introPattern: 'Immediate hook: question or bold claim in the first frame.',
    outroPattern: 'Key takeaway with a follow prompt.',
    pacing: 'Fast: 8-12 seconds per scene, constant motion.',
    preferredVisualFamilies: ['number-counter', 'process-flow', 'comparison', 'key-takeaway'],
    transitions: 'scale',
    captionTreatment: 'block',
    voiceTone: 'fast, energetic, direct',
    thumbnailTreatment: 'accent block with big number',
    scenePlanningGuidance: 'One idea per scene; cut anything not essential.',
  },
  'worked-example-lesson': {
    id: 'worked-example-lesson',
    name: 'Worked Example Lesson',
    description: 'Step-by-step worked examples with formulas and calculations. Ideal for math and finance.',
    bestFor: ['math', 'finance', 'physics', 'exams'],
    recommendedFormat: 'course-lesson',
    defaultStyleId: 'signature',
    aspectRatios: ['16:9'],
    defaultDurationSeconds: 540,
    introPattern: 'Problem statement with a formula preview.',
    outroPattern: 'Conclusion summarizing the method.',
    pacing: 'Methodical: one calculation step per scene, ~20 seconds each.',
    preferredVisualFamilies: ['formula', 'formula-derivation', 'step-by-step-calculation', 'equation-highlight'],
    transitions: 'crossfade',
    captionTreatment: 'pill',
    voiceTone: 'methodical, clear, encouraging',
    thumbnailTreatment: 'dark gradient with formula',
    scenePlanningGuidance: 'Show every intermediate step; never skip a transformation.',
  },
};

export function listTemplates(): VideoTemplate[] {
  return Object.values(videoTemplates);
}

export function getTemplate(templateId: string): VideoTemplate | undefined {
  return videoTemplates[templateId];
}

export function isRegisteredTemplate(templateId: string): boolean {
  return templateId in videoTemplates;
}

export function templateFormat(template: VideoTemplate): VideoFormat | undefined {
  return getFormat(template.recommendedFormat);
}

/** Validate registry integrity: every template references a known format and style. */
export function validateTemplateRegistry(knownStyles: ReadonlyArray<string>): string[] {
  const errors: string[] = [];
  for (const template of Object.values(videoTemplates)) {
    if (!isRegisteredFormat(template.recommendedFormat)) {
      errors.push(`Template ${template.id} references unknown format ${template.recommendedFormat}`);
    }
    if (!knownStyles.includes(template.defaultStyleId)) {
      errors.push(`Template ${template.id} references unknown style ${template.defaultStyleId}`);
    }
  }
  for (const format of listFormats()) {
    for (const style of format.suitableStyles) {
      if (!knownStyles.includes(style)) {
        errors.push(`Format ${format.id} references unknown style ${style}`);
      }
    }
  }
  return errors;
}

export {getFormat, listFormats};
