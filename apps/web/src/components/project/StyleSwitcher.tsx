'use client';

import {useState, useTransition} from 'react';
import {listStyles} from '@motionknowledge/visual-library/style';
import {changeProjectStyleAction} from '../../services/projects';

const styles = listStyles();

/** Change the project's visual style. Existing scenes render in the new style immediately. */
export function StyleSwitcher(props: {projectId: string; styleId: string}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const current = styles.find((style) => style.id === props.styleId);

  function onChange(styleId: string) {
    if (styleId === props.styleId) return;
    setDone(false);
    startTransition(async () => {
      try {
        await changeProjectStyleAction(props.projectId, styleId);
        setDone(true);
      } catch {
        setDone(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-[#9fb2c8]" htmlFor="project-style">
        Style
      </label>
      <select
        id="project-style"
        className="rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#59d5e0]"
        value={props.styleId}
        disabled={pending}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Project style"
      >
        {styles.map((style) => (
          <option key={style.id} value={style.id}>
            {style.name}
          </option>
        ))}
      </select>
      {pending ? <span className="text-xs text-[#9fb2c8]">Applying…</span> : null}
      {done ? <span className="text-xs text-[#4ade80]">Updated — re-render the preview to see it.</span> : null}
      {current ? <span className="hidden text-xs text-[#9fb2c8] sm:inline">v{current.version}</span> : null}
    </div>
  );
}
