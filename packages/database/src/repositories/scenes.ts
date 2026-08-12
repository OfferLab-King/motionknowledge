import {and, eq} from 'drizzle-orm';
import type {Database} from '../client';
import {scenes, sceneVersions} from '../schema/index';

export interface SceneRepository {
  restoreVersion(input: {
    sceneId: string;
    workspaceId: string;
    versionId: string;
  }): Promise<boolean>;
}

export class SceneRepositoryImpl implements SceneRepository {
  constructor(private readonly db: Database) {}

  async restoreVersion(input: {
    sceneId: string;
    workspaceId: string;
    versionId: string;
  }): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const scene = await tx
        .select()
        .from(scenes)
        .where(and(eq(scenes.id, input.sceneId), eq(scenes.workspaceId, input.workspaceId)))
        .limit(1);
      if (!scene[0]) return false;
      const version = await tx
        .select()
        .from(sceneVersions)
        .where(
          and(
            eq(sceneVersions.id, input.versionId),
            eq(sceneVersions.sceneId, input.sceneId),
          ),
        )
        .limit(1);
      if (!version[0]) return false;
      await tx
        .update(scenes)
        .set({activeSceneVersionId: input.versionId, status: 'SUCCEEDED'})
        .where(eq(scenes.id, input.sceneId));
      return true;
    });
  }
}
