import {NextResponse} from 'next/server';
import {z} from 'zod';
import {and, eq, inArray} from 'drizzle-orm';
import {getSessionUser} from '../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../lib/db';
import {getWorkspaceMemberships} from '../../../../../../services/projects';
import {claims, type Database} from '@motionknowledge/database';
import {LessonPlanV1, ScriptV1, StoryboardV1} from '@motionknowledge/schemas';
import {ArtifactRepositoryImpl} from '@motionknowledge/database';
import {stableHash} from '@motionknowledge/schemas/hash';
import {enqueueArtifactDownstream} from '../../../../../../services/scenes';
import {track} from '@motionknowledge/analytics';

const ARTIFACT_TYPES = ['lesson-plan', 'script', 'storyboard'] as const;
const ARTIFACT_TYPE_MAP: Record<(typeof ARTIFACT_TYPES)[number], 'LESSON_PLAN' | 'SCRIPT' | 'STORYBOARD'> = {
  'lesson-plan': 'LESSON_PLAN',
  script: 'SCRIPT',
  storyboard: 'STORYBOARD',
};

const SaveArtifactSchema = z.object({
  payload: z.unknown(),
});

export async function GET(_request: Request, {params}: {params: Promise<{projectId: string; type: string}>}) {
  const {projectId, type: rawType} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (!(ARTIFACT_TYPES as ReadonlyArray<string>).includes(rawType)) {
    return NextResponse.json({error: 'unknown artifact type'}, {status: 400});
  }
  const artifactType = ARTIFACT_TYPE_MAP[rawType as (typeof ARTIFACT_TYPES)[number]];
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  const repo = new ArtifactRepositoryImpl(db);
  const versions = await repo.listVersions<Record<string, unknown>>({projectId, workspaceId, artifactType});
  return NextResponse.json({
    versions: versions.map((version) => ({
      versionId: version.id,
      isActive: version.isActive,
      createdAt: version.createdAt.toISOString(),
      provider: version.provider ?? null,
      preview: JSON.stringify(version.payload).slice(0, 160),
    })),
  });
}

export async function POST(request: Request, {params}: {params: Promise<{projectId: string; type: string}>}) {
  const {projectId, type: rawType} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (!(ARTIFACT_TYPES as ReadonlyArray<string>).includes(rawType)) {
    return NextResponse.json({error: 'unknown artifact type'}, {status: 400});
  }
  const artifactType = ARTIFACT_TYPE_MAP[rawType as (typeof ARTIFACT_TYPES)[number]];
  const body = await request.json().catch(() => ({}));
  const parsed = SaveArtifactSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'invalid input'}, {status: 400});
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }

  try {
    let payload: unknown;
    let scenesToEnqueue: string[] = [];
    if (artifactType === 'LESSON_PLAN') {
      payload = LessonPlanV1.parse(parsed.data.payload);
      await assertClaimsExist(db, projectId, (payload as {sections: Array<{claimIds: string[]}>}).sections.flatMap((section) => section.claimIds));
    } else if (artifactType === 'SCRIPT') {
      payload = ScriptV1.parse(parsed.data.payload);
      await assertClaimsExist(
        db,
        projectId,
        (payload as {chapters: Array<{segments: Array<{claimIds: string[]}>}>}).chapters.flatMap((chapter) => chapter.segments.flatMap((segment) => segment.claimIds)),
      );
    } else {
      payload = StoryboardV1.parse(parsed.data.payload);
      const storyboard = payload as {scenes: Array<{claimIds: string[]; id: string}>};
      await assertClaimsExist(db, projectId, storyboard.scenes.flatMap((scene) => scene.claimIds));
      // Catalog visual data is validated at render time with a deterministic
      // fallback, so unparseable payloads degrade to a title card, never crash.
      scenesToEnqueue = storyboard.scenes.map((scene) => scene.id);
    }

    const repo = new ArtifactRepositoryImpl(db);
    const version = await repo.promoteVersion({
      projectId,
      workspaceId,
      artifactType,
      schemaVersion: 1,
      payload,
      inputHash: stableHash(payload),
      provider: 'web-editor',
      costUsd: '0',
    });
    const downstream = await enqueueArtifactDownstream(db, {workspaceId, projectId, artifactType, payload});
    track({event: 'artifact_edited', userId: user.id, workspaceId, projectId, properties: {artifactType}});
    return NextResponse.json({versionId: version.id, enqueued: downstream.count ?? 1});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'save failed';
    const invalid = message.includes('Invalid input') || message.includes('must') || message.includes('unknown claim');
    return NextResponse.json({error: message}, {status: invalid ? 400 : 500});
  }
}

async function assertClaimsExist(db: Database, projectId: string, claimIds: string[]): Promise<void> {
  const unique = [...new Set(claimIds)];
  if (unique.length === 0) throw new Error('Artifact must reference at least one claim');
  const rows = await db.select({claimId: claims.claimId}).from(claims).where(and(eq(claims.projectId, projectId), inArray(claims.claimId, unique)));
  const known = new Set(rows.map((row) => row.claimId));
  const missing = unique.filter((id) => !known.has(id));
  if (missing.length > 0) throw new Error(`Artifact cites unknown claim ${missing[0]}`);
}
