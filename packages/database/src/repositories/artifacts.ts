import {and, eq, ne, type SQL} from 'drizzle-orm';
import type {PgTable, PgColumn} from 'drizzle-orm/pg-core';
import type {Database} from '../client';
import {
  lessonPlanVersions,
  scriptVersions,
  storyboardVersions,
  captionVersions,
  ttsManifestVersions,
  qaVersions,
  renderManifestVersions,
  youtubeMetadataVersions,
  researchDocuments,
} from '../schema/index';

export const ARTIFACT_TYPES = [
  'LESSON_PLAN',
  'SCRIPT',
  'STORYBOARD',
  'CAPTIONS',
  'TTS_MANIFEST',
  'QA_RESULT',
  'RENDER_MANIFEST',
  'YOUTUBE_METADATA',
  'RESEARCH',
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export interface ArtifactVersion<T> {
  id: string;
  projectId: string;
  workspaceId: string;
  schemaVersion: number;
  payload: T;
  inputHash: string;
  isActive: boolean;
  createdAt: Date;
  provider?: string;
}

export interface PromoteVersionInput<T> {
  projectId: string;
  workspaceId: string;
  artifactType: ArtifactType;
  schemaVersion: 1;
  payload: T;
  inputHash: string;
  provider?: string;
  costUsd?: string;
}

export interface ArtifactRepository {
  promoteVersion<T>(input: PromoteVersionInput<T>): Promise<ArtifactVersion<T>>;
  getActiveVersion<T>(input: {
    projectId: string;
    workspaceId: string;
    artifactType: ArtifactType;
  }): Promise<ArtifactVersion<T> | null>;
}

type VersionTable = PgTable & {
  id: PgColumn;
  projectId: PgColumn;
  workspaceId: PgColumn;
  isActive: PgColumn;
};

const versionTables: Record<ArtifactType, VersionTable> = {
  LESSON_PLAN: lessonPlanVersions,
  SCRIPT: scriptVersions,
  STORYBOARD: storyboardVersions,
  CAPTIONS: captionVersions,
  TTS_MANIFEST: ttsManifestVersions,
  QA_RESULT: qaVersions,
  RENDER_MANIFEST: renderManifestVersions,
  YOUTUBE_METADATA: youtubeMetadataVersions,
  RESEARCH: researchDocuments,
};

export class ArtifactRepositoryImpl implements ArtifactRepository {
  constructor(private readonly db: Database) {}

  async promoteVersion<T>(input: PromoteVersionInput<T>): Promise<ArtifactVersion<T>> {
    const table = versionTables[input.artifactType];
    return this.db.transaction(async (tx) => {
      const values = {
        projectId: input.projectId,
        workspaceId: input.workspaceId,
        schemaVersion: input.schemaVersion,
        payload: input.payload,
        inputHash: input.inputHash,
        isActive: true,
      } as Record<string, unknown>;
      if ('provider' in table) {
        values.provider = input.provider ?? 'local';
        values.costUsd = input.costUsd ?? '0';
      }
      const inserted = await tx.insert(table).values(values).returning();
      const row = inserted[0]!;
      await tx
        .update(table)
        .set({isActive: false})
        .where(and(eq(table.projectId, input.projectId), ne(table.id, row.id)));
      return {
        id: String(row.id),
        projectId: String(row.projectId),
        workspaceId: String(row.workspaceId),
        schemaVersion: Number(row.schemaVersion),
        payload: row.payload as T,
        inputHash: String(row.inputHash),
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt as Date,
        provider: 'provider' in row ? String(row.provider) : undefined,
      };
    });
  }

  async getActiveVersion<T>(input: {
    projectId: string;
    workspaceId: string;
    artifactType: ArtifactType;
  }): Promise<ArtifactVersion<T> | null> {
    const table = versionTables[input.artifactType];
    const rows = await this.db
      .select()
      .from(table as never)
      .where(
        and(
          eq(table.projectId, input.projectId),
          eq(table.workspaceId, input.workspaceId),
          eq(table.isActive, true),
        ) as SQL,
      )
      .limit(1);
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      projectId: String(row.projectId),
      workspaceId: String(row.workspaceId),
      schemaVersion: Number(row.schemaVersion),
      payload: row.payload as T,
      inputHash: String(row.inputHash),
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt as Date,
      provider: 'provider' in row ? String(row.provider) : undefined,
    };
  }
}
