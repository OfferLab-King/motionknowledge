import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSessionUser} from '../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../lib/db';
import {getWorkspaceMemberships, resolveWorkspaceId} from '../../../../../../services/projects';
import {applySceneEdit, deleteScene} from '../../../../../../services/artifacts';
import {StyleOverrideSchema} from '@motionknowledge/schemas';
import {enqueueSceneNarration} from '../../../../../../services/scenes';
import {isRegisteredStyle} from '@motionknowledge/visual-library/style';
import {isRegisteredVisualId} from '@motionknowledge/visual-library/catalog';
import {track} from '@motionknowledge/analytics';

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  narration: z.string().min(1).max(10_000).optional(),
  durationSeconds: z.number().positive().max(600).optional(),
  styleOverride: StyleOverrideSchema.optional(),
  visual: z.object({visualId: z.string().min(1), data: z.unknown().optional(), htmlAssetKey: z.string().optional()}).optional(),
});

export async function PATCH(request: Request, {params}: {params: Promise<{projectId: string; sceneId: string}>}) {
  const {projectId, sceneId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'invalid input'}, {status: 400});
  if (parsed.data.styleOverride?.styleId && !isRegisteredStyle(parsed.data.styleOverride.styleId)) {
    return NextResponse.json({error: 'unknown style'}, {status: 400});
  }
  if (parsed.data.visual && parsed.data.visual.visualId !== '__hyperframes__' && !isRegisteredVisualId(parsed.data.visual.visualId)) {
    return NextResponse.json({error: 'unknown visual'}, {status: 400});
  }
  const db = getServiceDb();
  const workspaceId = await resolveWorkspaceId(db, user.id);
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  try {
    let htmlAssetKey: string | undefined;
    if (parsed.data.visual?.visualId === '__hyperframes__') {
      const {createStorageProvider, localStorageRoot} = await import('@motionknowledge/storage');
      const {demoHyperframeHtml} = await import('@motionknowledge/hyperframes-adapter');
      const storage = createStorageProvider({driver: 'local', localRoot: localStorageRoot});
      htmlAssetKey = `${workspaceId}/${projectId}/hyperframes/demo/scene.html`;
      const body = new TextEncoder().encode(demoHyperframeHtml(parsed.data.title ?? 'Custom animation'));
      const {createHash} = await import('node:crypto');
      const sha256 = createHash('sha256').update(body).digest('hex');
      await storage.put({key: htmlAssetKey, body, contentType: 'text/html', sha256});
    }
    const scene = await applySceneEdit(db, {
      projectId,
      workspaceId,
      sceneKey: sceneId,
      patch: parsed.data.visual?.visualId === '__hyperframes__'
        ? {...parsed.data, visual: {visualId: '__hyperframes__', htmlAssetKey}}
        : parsed.data,
    });
    // Edited narration needs fresh audio for the new version.
    if (parsed.data.narration) {
      try {
        await enqueueSceneNarration(db, {workspaceId, projectId, sceneKey: sceneId});
      } catch {
        // Narration refresh is best-effort; the scene edit itself succeeded.
      }
    }
    if (scene.visual.type === 'hyperframes') {
      // Enqueue the sandboxed specialist render for the new version.
      const {getQueue} = await import('../../../../../../lib/jobs');
      const {computeInputHash, buildIdempotencyKey} = await import('@motionknowledge/jobs');
      const queue = await getQueue();
      const inputHash = computeInputHash({sceneId, sceneVersionId: scene.sceneVersionId});
      await queue.enqueue({
        jobId: `${projectId}-hyperframe-${scene.sceneVersionId}`,
        workspaceId,
        projectId,
        operation: 'RENDER_HYPERFRAME',
        inputHash,
        idempotencyKey: buildIdempotencyKey({workspaceId, projectId, operation: 'RENDER_HYPERFRAME', inputHash, nonce: scene.sceneVersionId}),
        payload: {workspaceId, projectId, sceneId, sceneVersionId: scene.sceneVersionId},
      });
    }
    track({event: 'scene_edited', userId: user.id, workspaceId, projectId, properties: {sceneId}});
    return NextResponse.json({scene});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'edit failed'}, {status: 400});
  }
}

export async function DELETE(_request: Request, {params}: {params: Promise<{projectId: string; sceneId: string}>}) {
  const {projectId, sceneId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const db = getServiceDb();
  const workspaceId = await resolveWorkspaceId(db, user.id);
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  try {
    await deleteScene(db, {projectId, workspaceId, sceneKey: sceneId});
    track({event: 'scene_deleted', userId: user.id, workspaceId, projectId, properties: {sceneId}});
    return NextResponse.json({deleted: true});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'delete failed'}, {status: 400});
  }
}
