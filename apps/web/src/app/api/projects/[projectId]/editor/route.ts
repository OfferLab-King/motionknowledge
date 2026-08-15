import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSessionUser} from '../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../lib/db';
import {getWorkspaceMemberships, resolveWorkspaceId} from '../../../../../services/projects';
import {listScenes} from '../../../../../services/artifacts';
import {getActiveArtifact} from '../../../../../services/artifacts';
import {scenes as scenesTable} from '@motionknowledge/database';
import {eq} from 'drizzle-orm';
import {audioAssets} from '@motionknowledge/database';
import {buildRenderManifest} from '@motionknowledge/remotion-engine/manifest';
import type {TimedWord} from '@motionknowledge/schemas';
import {CaptionTrackV1} from '@motionknowledge/schemas';

export async function GET(request: Request, {params}: {params: Promise<{projectId: string}>}) {
  const {projectId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const db = getServiceDb();
  const workspaceId = await resolveWorkspaceId(db, user.id);
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }

  const sceneList = await listScenes(db, projectId);

  const sceneRows = await db.select().from(scenesTable).where(eq(scenesTable.projectId, projectId));
  const audioRows = await db.select().from(audioAssets).where(eq(audioAssets.projectId, projectId));
  const audioByScene = new Map<string, {wordTimings: TimedWord[]; assetKey: string}>();
  const sceneKeyByRowId = new Map(sceneRows.map((row) => [String(row.id), row.sceneKey]));
  for (const row of audioRows) {
    if (row.sceneId) {
      const sceneKey = sceneKeyByRowId.get(String(row.sceneId));
      if (sceneKey) audioByScene.set(sceneKey, {wordTimings: row.wordTimings as TimedWord[], assetKey: row.assetKey});
    }
  }

  const manifest = sceneList.length > 0
    ? buildRenderManifest({
        title: project.title,
        projectId,
        sceneVersions: sceneList.map((item) => item.scene),
        audioByScene,
        width: project.aspectRatio === '9:16' ? 720 : 1280,
        height: project.aspectRatio === '9:16' ? 1280 : 720,
        fps: 30,
        styleId: project.styleId ?? 'signature',
        styleVersion: project.styleVersion ?? 1,
        burnedCaptions: project.burnedCaptions ?? true,
        brandName: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? 'MotionKnowledge',
        brandMark: project.brandMark ?? true,
        audioUrlFor: (key) => `/api/objects/${key}`,
      })
    : null;

  return NextResponse.json({
    scenes: sceneList,
    manifest,
    captionCount: (await getActiveArtifact<z.infer<typeof CaptionTrackV1>>(db, projectId, workspaceId, 'CAPTIONS'))?.segments.length ?? 0,
  });
}
