import {getVisualDefinition} from '@motionknowledge/visual-library';
import type {Scene} from '@motionknowledge/schemas';

/**
 * Topic-neutral placeholder payloads for catalog visuals whose model-supplied
 * data failed schema validation. These carry NO topic-specific content (in
 * particular no finance/demo data), so an invalid payload never leaks example
 * content into an unrelated video. The scene stays editable; regenerating the
 * storyboard produces proper data.
 */
export function neutralVisualPayload(visualId: string, title: string): unknown {
  const t = title || 'Key idea';
  switch (visualId) {
    case 'title-hero':
      return {title: t, subtitle: '', kicker: ''};
    case 'section-intro':
      return {title: t, kicker: 'Next', bullets: ['First point', 'Second point']};
    case 'definition-card':
      return {term: t, definition: 'A definition for this term.', example: ''};
    case 'bullet-reveal':
      return {title: t, bullets: ['First point', 'Second point', 'Third point']};
    case 'comparison':
      return {title: t, items: [{name: 'Option A', value: 'First option'}, {name: 'Option B', value: 'Second option'}]};
    case 'pros-cons':
      return {title: t, pros: ['Advantage'], cons: ['Trade-off']};
    case 'timeline':
      return {title: t, events: [{label: 'Start', caption: 'First step'}, {label: 'End', caption: 'Final step'}]};
    case 'cashflow-timeline':
      return {title: t, periods: [{year: 0, label: 'Today', amount: 0, displayAmount: '0', type: 'outflow'}, {year: 1, label: 'Later', amount: 1, displayAmount: '1', type: 'inflow'}]};
    case 'process-flow':
      return {title: t, steps: ['First', 'Second', 'Third']};
    case 'flow-chart':
      return {title: t, steps: ['Start', 'Decision', 'Result'], branchLabels: ['yes', 'no']};
    case 'before-after':
      return {title: t, before: 'Before', after: 'After'};
    case 'bar-chart':
      return {title: t, series: [{label: 'A', value: 2}, {label: 'B', value: 4}]};
    case 'line-chart':
      return {title: t, series: [{label: 'A', value: 1}, {label: 'B', value: 3}, {label: 'C', value: 2}]};
    case 'area-chart':
      return {title: t, series: [{label: 'A', value: 1}, {label: 'B', value: 3}, {label: 'C', value: 2}]};
    case 'donut-chart':
      return {title: t, slices: [{label: 'A', value: 50}, {label: 'B', value: 30}, {label: 'C', value: 20}]};
    case 'data-table':
      return {title: t, headers: ['Item', 'Value'], rows: [['A', '1'], ['B', '2']]};
    case 'number-counter':
      return {title: t, value: 1, unit: '', caption: ''};
    case 'formula':
      return {title: t, formula: 'x = y', description: ''};
    case 'formula-derivation':
      return {title: t, steps: ['Step one', 'Step two'], conclusion: 'Result'};
    case 'equation-highlight':
      return {equation: 'a = b', highlights: ['a: first part', 'b: second part'], caption: ''};
    case 'step-by-step-calculation':
      return {title: t, steps: [{expression: '1 + 1', result: '2'}], conclusion: 'Done'};
    case 'code-block':
      return {title: t, language: 'text', code: '// example'};
    case 'terminal-demo':
      return {title: t, lines: [{prompt: true, text: 'example command'}]};
    case 'browser-frame':
      return {title: t, url: 'https://example.com', caption: ''};
    case 'screenshot-callout':
      return {title: t, caption: 'Screen', callouts: ['Part one', 'Part two']};
    case 'relationship-diagram':
      return {title: t, subject: t, related: [{label: 'Related', relation: 'connects'}]};
    case 'network-diagram':
      return {title: t, nodes: [{label: 'A', group: 0}, {label: 'B', group: 1}]};
    case 'matrix':
      return {title: t, quadrants: [
        {label: 'Q1', description: 'One'},
        {label: 'Q2', description: 'Two'},
        {label: 'Q3', description: 'Three'},
        {label: 'Q4', description: 'Four'},
      ]};
    case 'pyramid':
      return {title: t, layers: [{label: 'Top', caption: ''}, {label: 'Base', caption: ''}]};
    case 'funnel':
      return {title: t, stages: [{label: 'Start', value: '10'}, {label: 'End', value: '5'}]};
    case 'quiz-question':
      return {question: t, options: ['Option A', 'Option B', 'Option C', 'Option D']};
    case 'quiz-answer':
      return {question: t, correct: 'Option A', explanation: ''};
    case 'summary':
      return {title: t, points: ['First point', 'Second point']};
    case 'outro':
      return {title: 'Thanks for watching', tagline: ''};
    case 'quote':
      return {text: t, attribution: ''};
    case 'key-takeaway':
      return {title: 'Key takeaway', text: t};
    default:
      return {title: t};
  }
}

/** Replaces invalid catalog payloads with the neutral placeholder. */
export function repairCatalogVisualData(scene: Scene): void {
  const visual = scene.visual;
  if (visual.type !== 'catalog') return;
  const definition = getVisualDefinition(visual.data.visualId);
  if (!definition) return;
  const parsed = definition.propsSchema.safeParse(visual.data.data);
  if (!parsed.success) {
    visual.data.data = neutralVisualPayload(definition.id, scene.title);
  }
}
