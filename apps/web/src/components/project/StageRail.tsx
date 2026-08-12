import Link from 'next/link';
import {StatusPill} from '@motionknowledge/ui';

export interface Stage {
  key: string;
  label: string;
  href: string;
  status: string | null;
  version: string | null;
  provider: string | null;
  costUsd: string | null;
}

export function StageRail({stages, active}: {stages: Stage[]; active: string}) {
  return (
    <ol className="flex flex-col gap-1">
      {stages.map((stage) => {
        const isActive = stage.key === active;
        return (
          <li key={stage.key}>
            <Link
              href={stage.href}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors ${
                isActive ? 'bg-[#1a3050]' : 'hover:bg-[#0f1c30]'
              }`}
            >
              <span className="text-sm font-medium text-[#f8fafc]">{stage.label}</span>
              {stage.status ? <StatusPill status={stage.status} /> : <span className="text-xs text-[#9fb2c8]">—</span>}
            </Link>
            {stage.version ? (
              <div className="ml-3 text-xs text-[#9fb2c8]">
                v{stage.version}
                {stage.provider ? ` · ${stage.provider}` : ''}
                {stage.costUsd && stage.costUsd !== '0' ? ` · $${stage.costUsd}` : ''}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
