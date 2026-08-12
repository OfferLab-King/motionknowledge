export const JOB_NAMES = [
  'INGEST_SOURCE',
  'RESEARCH_PROJECT',
  'GENERATE_OUTLINE',
  'GENERATE_SCRIPT',
  'GENERATE_STORYBOARD',
  'GENERATE_SCENE',
  'SYNTHESIZE_TTS',
  'GENERATE_CAPTIONS',
  'GENERATE_PREVIEW',
  'RUN_QA',
  'RENDER_FINAL',
  'GENERATE_THUMBNAIL',
] as const;

export type JobName = (typeof JOB_NAMES)[number];

export const JOB_RETRY_POLICIES: Readonly<Record<JobName, 'transient' | 'never'>> = {
  INGEST_SOURCE: 'transient',
  RESEARCH_PROJECT: 'transient',
  GENERATE_OUTLINE: 'transient',
  GENERATE_SCRIPT: 'transient',
  GENERATE_STORYBOARD: 'transient',
  GENERATE_SCENE: 'transient',
  SYNTHESIZE_TTS: 'transient',
  GENERATE_CAPTIONS: 'transient',
  GENERATE_PREVIEW: 'transient',
  RUN_QA: 'never',
  RENDER_FINAL: 'transient',
  GENERATE_THUMBNAIL: 'transient',
};
