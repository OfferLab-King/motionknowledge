import {NextResponse} from 'next/server';
import {eq} from 'drizzle-orm';
import {getSessionUser} from '../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../lib/db';
import {getWorkspaceMemberships} from '../../../../../services/projects';
import {getActiveArtifact, listJobs, listScenes} from '../../../../../services/artifacts';
import {audioAssets} from '@motionknowledge/database';
import {listProjectRenders} from '../../../../../services/downloads';
import type {LessonPlan, Script, Storyboard} from '@motionknowledge/schemas';
import type {Scene} from '@motionknowledge/schemas';

export interface StageStatus {
  key: string;
  label: string;
  status: string | null;
  version: string | null;
  provider: string | null;
  costUsd: string | null;
}

export async function GET(_request: Request, {params}: {params: Promise<{projectId: string}>}) {
  const {projectId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }

  const lesson = await getActiveArtifact<LessonPlan>(db, projectId, workspaceId, 'LESSON_PLAN');
  const script = await getActiveArtifact<Script>(db, projectId, workspaceId, 'SCRIPT');
  const storyboard = await getActiveArtifact<Storyboard>(db, projectId, workspaceId, 'STORYBOARD');
  const jobs = await listJobs(db, projectId);
  const audioRows = await db.select({model: audioAssets.model, provider: audioAssets.provider}).from(audioAssets).where(eq(audioAssets.projectId, projectId)).limit(1);
  const sceneList = await listScenes(db, projectId);
  const renders = await listProjectRenders(db, projectId);

  const stages: StageStatus[] = [
    {
      key: 'sources',
      label: 'Sources & claims',
      status: 'succeeded',
      version: null,
      provider: null,
      costUsd: null,
    },
    {
      key: 'outline',
      label: 'Lesson outline',
      status: lesson ? 'succeeded' : 'queued',
      version: lesson ? String(lesson.schemaVersion) : null,
      provider: (lesson as LessonPlan & {provider?: string})?.provider ?? null,
      costUsd: null,
    },
    {
      key: 'script',
      label: 'Script & chapters',
      status: script ? 'succeeded' : 'queued',
      version: script ? String(script.schemaVersion) : null,
      provider: (script as Script & {provider?: string})?.provider ?? null,
      costUsd: null,
    },
    {
      key: 'storyboard',
      label: 'Storyboard',
      status: storyboard ? 'succeeded' : 'queued',
      version: storyboard ? String(storyboard.schemaVersion) : null,
      provider: (storyboard as Storyboard & {provider?: string})?.provider ?? null,
      costUsd: null,
    },
    {
      key: 'scenes',
      label: 'Scenes & narration',
      status: sceneList.length > 0 && sceneList.every((s) => s.status === 'SUCCEEDED') ? 'succeeded' : sceneList.length > 0 ? 'running' : 'queued',
      version: sceneList.length > 0 ? `${sceneList.filter((s) => s.status === 'SUCCEEDED').length}/${sceneList.length}` : null,
      provider: null,
      costUsd: null,
    },
    {
      key: 'preview',
      label: 'Preview & QA',
      status: project.status === 'QA_FAILED' ? 'failed' : project.status === 'READY_FOR_REVIEW' || project.status === 'APPROVED' || project.status === 'COMPLETE' ? 'succeeded' : 'queued',
      version: null,
      provider: null,
      costUsd: null,
    },
    {
      key: 'render',
      label: 'Final render',
      status: project.status === 'COMPLETE' ? 'succeeded' : project.status === 'RENDERING' ? 'running' : project.status === 'APPROVED' ? 'queued' : null,
      version: renders.at(-1)?.status === 'succeeded' ? 'ready' : null,
      provider: null,
      costUsd: null,
    },
  ];

  return NextResponse.json({
    status: project.status,
    stages,
    jobs: jobs.slice(-8).map((job) => ({
      id: job.id,
      operation: job.operation,
      status: job.status,
      attempt: job.attempt,
      errorCode: job.errorCode,
      safeError: job.safeError,
    })),
    sceneProgress: {
      ready: sceneList.filter((s) => s.status === 'SUCCEEDED').length,
      total: sceneList.length,
    },
    finalRenderStatus: renders.at(-1)?.status ?? null,
    narrationModel: audioRows[0]?.model ?? null,
  });
}

