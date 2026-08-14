import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getServiceDb} from '../../../lib/db';
import {projectShareTokens, renders} from '@motionknowledge/database';
import {eq} from 'drizzle-orm';
import {signObjectUrl} from '../../../services/downloads';

export default async function SharePage({params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  const db = getServiceDb();
  const share = (await db.select().from(projectShareTokens).where(eq(projectShareTokens.token, token)).limit(1))[0];
  if (!share) notFound();
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, share.projectId)});
  if (!project) notFound();
  const rows = await db.select().from(renders).where(eq(renders.projectId, share.projectId));
  const finals = rows.filter((row) => row.kind === 'FINAL' && row.status === 'succeeded');

  const files: Array<{label: string; fileName: string; url: string | null}> = [];
  for (const render of finals) {
    const renderFiles: Array<{label: string; fileName: string; key: string | null}> = [
      {label: 'MP4', fileName: 'video.mp4', key: render.mp4Key},
      {label: 'SRT captions', fileName: 'video.srt', key: render.srtKey},
      {label: 'Transcript', fileName: 'transcript.txt', key: render.transcriptKey},
      {label: 'Chapters', fileName: 'chapters.txt', key: render.chaptersKey},
      {label: 'Thumbnail', fileName: 'thumbnail.png', key: render.thumbnailKey},
      {label: 'Render metadata', fileName: 'render-metadata.json', key: render.metadataKey},
    ];
    for (const file of renderFiles) {
      if (file.key) files.push({label: file.label, fileName: file.fileName, url: signObjectUrl(file.key, 600)});
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f8fafc]">{project.title}</h1>
        <p className="mt-1 text-sm text-[#9fb2c8]">Shared read-only video exports.</p>
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-[#9fb2c8]">No finished render is available for this project yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((file) => (
            <a
              key={file.label}
              href={file.url ?? '#'}
              download={file.fileName}
              className="rounded-lg border border-[#2a4568] bg-[#0f1c30] px-4 py-3 text-sm font-semibold text-[#f8fafc] hover:bg-[#1a3050]"
            >
              Download {file.label}
            </a>
          ))}
        </div>
      )}
      <p className="mt-8 text-xs text-[#64748b]">
        Shared by MotionKnowledge · links expire after 10 minutes.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-[#59d5e0]">
        ← MotionKnowledge
      </Link>
    </div>
  );
}
