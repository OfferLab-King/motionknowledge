import {track} from '@motionknowledge/analytics';
import {NextResponse} from 'next/server';

export function trackExportDownload(input: {
  userId: string;
  workspaceId: string;
  projectId: string;
  renderId: string;
  kind: string;
}) {
  track({event: 'export_downloaded', userId: input.userId, workspaceId: input.workspaceId, projectId: input.projectId, properties: {renderId: input.renderId, kind: input.kind}});
  return NextResponse.json({ok: true});
}

export {track};
