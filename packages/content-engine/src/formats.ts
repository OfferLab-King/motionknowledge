/**
 * Video formats: pedagogical planning grammars. A format describes the
 * structure of an explanation (what the lesson plan and storyboard should
 * contain and in what order) — never its appearance. Formats are planning
 * guidance the content engine adapts, not rigid scene lists.
 */

export interface FormatSceneRole {
  step: string;
  intent: string;
  guidance: string;
}

export interface VideoFormat {
  id: string;
  name: string;
  description: string;
  tags: string[];
  storyStructure: FormatSceneRole[];
  preferredVisualFamilies: string[];
  suitableStyles: string[];
}

export const videoFormats: Readonly<Record<string, VideoFormat>> = {
  explainer: {
    id: 'explainer',
    name: 'Explainer',
    description: 'A single concept explained clearly: hook, definition, mechanism, worked example, takeaway.',
    tags: ['concepts', 'youtube', 'intro', 'education'],
    storyStructure: [
      {step: 'Hook / question', intent: 'Capture attention with the question the video answers', guidance: 'One short scene; pose the question, do not answer it yet.'},
      {step: 'Definition', intent: 'Define the core term precisely', guidance: 'Use a definition card; keep it to one crisp sentence plus a short example.'},
      {step: 'Conceptual mechanism', intent: 'Explain how the concept works', guidance: 'Process flow, diagram or relationship visual; this is the heart of the video.'},
      {step: 'Worked example', intent: 'Apply the concept to a concrete case', guidance: 'Numbers, steps or a chart; make it small and traceable.'},
      {step: 'Key takeaway', intent: 'Leave the audience with one memorable point', guidance: 'Restate the answer to the hook in one line.'},
    ],
    preferredVisualFamilies: ['title-hero', 'definition-card', 'process-flow', 'comparison', 'key-takeaway'],
    suitableStyles: ['signature', 'editorial', 'minimal'],
  },
  tutorial: {
    id: 'tutorial',
    name: 'Tutorial',
    description: 'Do-it-yourself instruction: outcome first, then prerequisites, steps, demonstration and common mistakes.',
    tags: ['how-to', 'steps', 'skills', 'software'],
    storyStructure: [
      {step: 'Outcome', intent: 'Show what the learner will be able to do', guidance: 'State the outcome concretely with a preview of the result.'},
      {step: 'Prerequisites', intent: 'List what the learner needs', guidance: 'Short checklist; skip if the audience is known to be ready.'},
      {step: 'Steps', intent: 'Walk through the procedure', guidance: 'One step per scene, numbered, in order.'},
      {step: 'Demonstration', intent: 'Show the result in action', guidance: 'Screenshot/browser/terminal visuals; keep it realistic.'},
      {step: 'Common mistake', intent: 'Warn about the typical failure mode', guidance: 'Before/after or pros/cons visual; one mistake, clearly named.'},
      {step: 'Recap', intent: 'Summarize the procedure', guidance: 'Numbered summary matching the steps.'},
    ],
    preferredVisualFamilies: ['bullet-reveal', 'step-by-step-calculation', 'screenshot-callout', 'before-after', 'summary'],
    suitableStyles: ['handwritten', 'presentation'],
  },
  'course-lesson': {
    id: 'course-lesson',
    name: 'Course Lesson',
    description: 'A structured lesson inside a course: objectives, prior knowledge, concept, explanation, check, summary.',
    tags: ['course', 'classroom', 'structured', 'learning objectives'],
    storyStructure: [
      {step: 'Learning objectives', intent: 'State what the lesson teaches', guidance: 'Bullet list of 2-3 measurable objectives.'},
      {step: 'Prior knowledge', intent: 'Connect to what the learner already knows', guidance: 'Brief recap or prerequisite reference.'},
      {step: 'Main concept', intent: 'Introduce the core idea', guidance: 'One clear statement, possibly with a formula.'},
      {step: 'Explanation', intent: 'Develop the concept in depth', guidance: 'Charts, diagrams, comparisons — one idea per scene.'},
      {step: 'Worked example', intent: 'Model the application', guidance: 'Step-by-step calculation or data table.'},
      {step: 'Knowledge check', intent: 'Verify understanding', guidance: 'Quiz question then answer with explanation.'},
      {step: 'Summary', intent: 'Consolidate the lesson', guidance: 'Recap points tied to the objectives.'},
    ],
    preferredVisualFamilies: ['section-intro', 'bullet-reveal', 'formula', 'step-by-step-calculation', 'quiz-question', 'quiz-answer', 'summary'],
    suitableStyles: ['presentation', 'handwritten', 'signature'],
  },
  'business-analysis': {
    id: 'business-analysis',
    name: 'Business / Professional Analysis',
    description: 'A structured analysis for professional audiences: framing, evidence, metrics, implications, recommendation.',
    tags: ['business', 'finance', 'analysis', 'professional'],
    storyStructure: [
      {step: 'Framing', intent: 'State the question or decision at hand', guidance: 'One-sentence framing; name the metric used.'},
      {step: 'Evidence', intent: 'Present the key facts and numbers', guidance: 'Charts, tables, KPI cards; keep figures sourced.'},
      {step: 'Metrics', intent: 'Explain what the numbers mean', guidance: 'Comparison, data table or cashflow/timeline.'},
      {step: 'Implications', intent: 'Draw out consequences', guidance: 'Pros/cons, before/after or scenario comparison.'},
      {step: 'Recommendation', intent: 'Conclude with a clear position', guidance: 'Key takeaway stating the recommended action.'},
    ],
    preferredVisualFamilies: ['data-table', 'bar-chart', 'comparison', 'cashflow-timeline', 'pros-cons', 'key-takeaway'],
    suitableStyles: ['business', 'presentation', 'signature'],
  },
  'list-breakdown': {
    id: 'list-breakdown',
    name: 'List / Breakdown',
    description: 'Deconstruct a topic into a ranked or categorized list of items.',
    tags: ['top10', 'breakdown', 'ranking', 'list'],
    storyStructure: [
      {step: 'Premise', intent: 'Announce the list and its criterion', guidance: 'Short title scene naming the criterion.'},
      {step: 'Items', intent: 'Present each item with a reason', guidance: 'One item per scene; consistent structure across items.'},
      {step: 'Honorable mention / recap', intent: 'Wrap up with a summary view', guidance: 'Summary or numbered list of all items.'},
    ],
    preferredVisualFamilies: ['bullet-reveal', 'comparison', 'pyramid', 'funnel', 'summary'],
    suitableStyles: ['editorial', 'minimal', 'signature'],
  },
  'story-narrative': {
    id: 'story-narrative',
    name: 'Story / Narrative',
    description: 'A narrative arc: setup, conflict/turning point, resolution, moral.',
    tags: ['story', 'narrative', 'history', 'biography'],
    storyStructure: [
      {step: 'Setup', intent: 'Establish the starting situation', guidance: 'Title and context; keep it vivid but factual.'},
      {step: 'Turning point', intent: 'Introduce the event or discovery that changes things', guidance: 'Timeline or before/after visual.'},
      {step: 'Consequences', intent: 'Show what followed', guidance: 'Timeline, chart or relationship diagram.'},
      {step: 'Resolution / moral', intent: 'Land the takeaway', guidance: 'Quote or key takeaway tied back to the setup.'},
    ],
    preferredVisualFamilies: ['title-hero', 'timeline', 'before-after', 'quote', 'key-takeaway'],
    suitableStyles: ['signature', 'minimal', 'handwritten'],
  },
};

export function listFormats(): VideoFormat[] {
  return Object.values(videoFormats);
}

export function getFormat(formatId: string): VideoFormat | undefined {
  return videoFormats[formatId];
}

export function isRegisteredFormat(formatId: string): boolean {
  return formatId in videoFormats;
}

export function formatGrammarForPrompt(formatId: string): string {
  const format = getFormat(formatId);
  if (!format) return '';
  return [
    `Format: ${format.name} — ${format.description}`,
    ...format.storyStructure.map((role, i) => `${i + 1}. ${role.step} (${role.intent}): ${role.guidance}`),
  ].join('\n');
}
