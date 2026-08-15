'use client';

import {useState, useTransition} from 'react';
import {updateProjectFlagsAction} from '../../services/projects';

export function VideoSettingsToggles(props: {
  projectId: string;
  burnedCaptions: boolean;
  musicBed: boolean;
  brandMark: boolean;
}) {
  const [flags, setFlags] = useState({
    burnedCaptions: props.burnedCaptions,
    musicBed: props.musicBed,
    brandMark: props.brandMark,
  });
  const [pending, startTransition] = useTransition();

  function setFlag(key: 'burnedCaptions' | 'musicBed' | 'brandMark', value: boolean) {
    const next = {...flags, [key]: value};
    setFlags(next);
    startTransition(async () => {
      try {
        await updateProjectFlagsAction(props.projectId, next);
      } catch {
        setFlags(flags);
      }
    });
  }

  const rows: Array<{key: 'burnedCaptions' | 'musicBed' | 'brandMark'; label: string}> = [
    {key: 'burnedCaptions', label: 'Burned captions (styled by the visual style)'},
    {key: 'musicBed', label: 'Music bed (deterministic ambient, ducked under narration)'},
    {key: 'brandMark', label: 'Brand mark in the corner'},
  ];

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <label key={row.key} className="flex items-center gap-2 text-xs text-[#9fb2c8]">
          <input
            type="checkbox"
            checked={flags[row.key]}
            disabled={pending}
            onChange={(event) => setFlag(row.key, event.target.checked)}
            aria-label={row.label}
            className="h-4 w-4 accent-[#59d5e0]"
          />
          {row.label}
        </label>
      ))}
    </div>
  );
}
