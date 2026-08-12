import {z} from 'zod';

export const PROJECT_STATUSES = [
  'DRAFT',
  'RESEARCHING',
  'OUTLINE_READY',
  'SCRIPT_READY',
  'STORYBOARD_READY',
  'GENERATING',
  'PREVIEW_READY',
  'QA_FAILED',
  'READY_FOR_REVIEW',
  'APPROVED',
  'RENDERING',
  'COMPLETE',
] as const;

export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const PROJECT_TRANSITIONS: Readonly<Record<ProjectStatus, ReadonlyArray<ProjectStatus>>> = {
  DRAFT: ['RESEARCHING', 'OUTLINE_READY'],
  RESEARCHING: ['OUTLINE_READY', 'QA_FAILED'],
  OUTLINE_READY: ['SCRIPT_READY', 'RESEARCHING'],
  SCRIPT_READY: ['STORYBOARD_READY', 'OUTLINE_READY'],
  STORYBOARD_READY: ['GENERATING', 'SCRIPT_READY'],
  GENERATING: ['PREVIEW_READY', 'QA_FAILED'],
  PREVIEW_READY: ['QA_FAILED', 'READY_FOR_REVIEW', 'GENERATING'],
  QA_FAILED: ['GENERATING', 'STORYBOARD_READY'],
  READY_FOR_REVIEW: ['APPROVED', 'GENERATING', 'QA_FAILED'],
  APPROVED: ['RENDERING', 'GENERATING'],
  RENDERING: ['COMPLETE', 'QA_FAILED'],
  COMPLETE: ['RENDERING', 'APPROVED'],
};

export function transitionProjectStatus(from: ProjectStatus, to: ProjectStatus): ProjectStatus {
  const allowed = PROJECT_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid project transition ${from} -> ${to}`);
  }
  return to;
}
