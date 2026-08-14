'use client';

import {useState, useTransition} from 'react';
import {setBurnedCaptionsAction} from '../../services/projects';

/** Toggle on-video (burned) captions. Styled by the project's style. */
export function CaptionsToggle(props: {projectId: string; burnedCaptions: boolean}) {
  const [enabled, setEnabled] = useState(props.burnedCaptions);
  const [pending, startTransition] = useTransition();

  function onChange(value: boolean) {
    setEnabled(value);
    startTransition(async () => {
      try {
        await setBurnedCaptionsAction(props.projectId, value);
      } catch {
        setEnabled(props.burnedCaptions);
      }
    });
  }

  return (
    <label className="flex items-center gap-2 text-xs text-[#9fb2c8]">
      <input
        type="checkbox"
        checked={enabled}
        disabled={pending}
        onChange={(event) => onChange(event.target.checked)}
        aria-label="Burned captions"
        className="h-4 w-4 accent-[#59d5e0]"
      />
      Burned captions (styled by the visual style)
    </label>
  );
}
