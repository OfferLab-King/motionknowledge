import {and, eq} from 'drizzle-orm';
import type {Database} from '../client';
import {projects} from '../schema/index.js';
import {transitionProjectStatus, type ProjectStatus} from '@motionknowledge/schemas';

export interface ProjectRecord {
  id: string;
  workspaceId: string;
  title: string;
  audienceLevel: string;
  targetDurationSeconds: number;
  language: string;
  tone: string;
  style: string;
  aspectRatio: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewProject {
  workspaceId: string;
  title: string;
  audienceLevel: string;
  targetDurationSeconds: number;
  language?: string;
  tone?: string;
  style?: string;
  aspectRatio?: string;
}

export interface ProjectRepository {
  getAuthorized(projectId: string, workspaceId: string): Promise<ProjectRecord | null>;
  getById(projectId: string): Promise<ProjectRecord | null>;
  create(input: NewProject): Promise<ProjectRecord>;
  updateStatus(input: {
    projectId: string;
    workspaceId: string;
    from: ProjectStatus;
    to: ProjectStatus;
  }): Promise<boolean>;
  listForWorkspace(workspaceId: string): Promise<ProjectRecord[]>;
}

export class ProjectRepositoryImpl implements ProjectRepository {
  constructor(private readonly db: Database) {}

  async getAuthorized(projectId: string, workspaceId: string): Promise<ProjectRecord | null> {
    const rows = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async getById(projectId: string): Promise<ProjectRecord | null> {
    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(input: NewProject): Promise<ProjectRecord> {
    const rows = await this.db
      .insert(projects)
      .values({
        workspaceId: input.workspaceId,
        title: input.title,
        audienceLevel: input.audienceLevel,
        targetDurationSeconds: input.targetDurationSeconds,
        language: input.language ?? 'en',
        tone: input.tone ?? 'professional',
        style: input.style ?? 'professional',
        aspectRatio: input.aspectRatio ?? '16:9',
      })
      .returning();
    return rows[0]!;
  }

  async updateStatus(input: {
    projectId: string;
    workspaceId: string;
    from: ProjectStatus;
    to: ProjectStatus;
  }): Promise<boolean> {
    transitionProjectStatus(input.from, input.to);
    const rows = await this.db
      .update(projects)
      .set({status: input.to})
      .where(
        and(
          eq(projects.id, input.projectId),
          eq(projects.workspaceId, input.workspaceId),
          eq(projects.status, input.from),
        ),
      )
      .returning({id: projects.id});
    return rows.length === 1;
  }

  async listForWorkspace(workspaceId: string): Promise<ProjectRecord[]> {
    return this.db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(projects.createdAt);
  }
}
