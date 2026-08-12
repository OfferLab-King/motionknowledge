import Link from 'next/link';
import {StageRail} from './StageRail';
import {ArtifactEditor} from './ArtifactEditor';
import type {Stage} from './StageRail';

export function ArtifactStagePage(props: {
  projectId: string;
  projectStatus: string;
  active: string;
  label: string;
  artifact: {
    status: string | null;
    version: string | null;
    provider: string | null;
    costUsd: string | null;
    json: string | null;
  };
}) {
  const stages: Stage[] = [
    {key: 'sources', label: 'Sources & claims', href: `/projects/${props.projectId}`, status: props.projectStatus, version: null, provider: null, costUsd: null},
    {key: 'outline', label: 'Lesson outline', href: `/projects/${props.projectId}/outline`, status: null, version: null, provider: null, costUsd: null},
    {key: 'script', label: 'Script & chapters', href: `/projects/${props.projectId}/script`, status: null, version: null, provider: null, costUsd: null},
    {key: 'storyboard', label: 'Storyboard', href: `/projects/${props.projectId}/storyboard`, status: null, version: null, provider: null, costUsd: null},
    {key: 'scenes', label: 'Scenes & narration', href: `/projects/${props.projectId}/editor`, status: null, version: null, provider: null, costUsd: null},
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-4">
        <StageRail stages={stages} active={props.active} />
        <Link href={`/projects/${props.projectId}`} className="mt-4 inline-block text-sm text-[#59d5e0]">
          ← Back to project
        </Link>
      </div>
      <ArtifactEditor artifact={{key: props.active, label: props.label, ...props.artifact}} />
    </div>
  );
}
