import {StatusPill} from '@motionknowledge/ui';
import {Card} from '@motionknowledge/ui';

export interface ArtifactData {
  key: string;
  label: string;
  status: string | null;
  version: string | null;
  provider: string | null;
  costUsd: string | null;
  json: string | null;
}

export function ArtifactEditor({artifact}: {artifact: ArtifactData}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#f8fafc]">{artifact.label}</h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-[#9fb2c8]">
            {artifact.version ? <span>Version {artifact.version}</span> : null}
            {artifact.provider ? <span>Provider: {artifact.provider}</span> : null}
            {artifact.costUsd && artifact.costUsd !== '0' ? <span>Est. cost: ${artifact.costUsd}</span> : null}
            {artifact.status ? <StatusPill status={artifact.status} /> : null}
          </div>
        </div>
      </div>
      {artifact.json ? (
        <pre className="max-h-[60vh] overflow-auto rounded-lg bg-[#0a1526] p-4 text-xs leading-relaxed text-[#9fb2c8]">
          {artifact.json}
        </pre>
      ) : (
        <p className="text-sm text-[#9fb2c8]">
          Not generated yet. The worker will produce this stage after the previous stage is approved.
        </p>
      )}
    </Card>
  );
}
