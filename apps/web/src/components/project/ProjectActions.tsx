'use client';

import {useState, useTransition} from 'react';
import {renameProjectAction, deleteProjectAction, duplicateProjectAction} from '../../services/projects';

export function ProjectActions(props: {projectId: string; title: string}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(props.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(() => {
      void action().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Action failed'));
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Project actions"
        aria-expanded={open}
        className="rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] hover:bg-[#1a3050]"
      >
        Actions ▾
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-[#2a4568] bg-[#0f1c30] p-4 shadow-xl">
          <div className="flex flex-col gap-3">
            {renaming ? (
              <div className="flex flex-col gap-2">
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  aria-label="Project title"
                  className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#59d5e0]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await renameProjectAction(props.projectId, draftTitle);
                        setRenaming(false);
                        setOpen(false);
                      })
                    }
                    className="rounded bg-[#59d5e0] px-3 py-1.5 text-xs font-semibold text-[#08111f] disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenaming(false)}
                    className="rounded border border-[#2a4568] px-3 py-1.5 text-xs text-[#9fb2c8]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraftTitle(props.title);
                  setRenaming(true);
                }}
                className="rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-left text-sm text-[#f8fafc] hover:bg-[#1a3050]"
              >
                Rename project
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => duplicateProjectAction(props.projectId))}
              className="rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-left text-sm text-[#f8fafc] hover:bg-[#1a3050] disabled:opacity-50"
            >
              Duplicate project
            </button>
            {confirmingDelete ? (
              <div className="flex flex-col gap-2 rounded-lg border border-[#fb7185]/40 bg-[#1a0f1f] p-3">
                <p className="text-xs text-[#fb7185]">Delete this project and all its artifacts, scenes and renders? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => deleteProjectAction(props.projectId))}
                    className="rounded bg-[#fb7185] px-3 py-1.5 text-xs font-semibold text-[#08111f] disabled:opacity-50"
                  >
                    Delete forever
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded border border-[#2a4568] px-3 py-1.5 text-xs text-[#9fb2c8]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded-lg border border-[#fb7185]/40 bg-[#1a0f1f] px-3 py-2 text-left text-sm text-[#fb7185] hover:bg-[#2a1520]"
              >
                Delete project
              </button>
            )}
            {error ? <p className="text-xs text-[#fb7185]">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
