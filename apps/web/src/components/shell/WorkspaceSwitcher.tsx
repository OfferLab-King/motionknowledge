'use client';

import {useState, useTransition} from 'react';
import {setActiveWorkspaceAction, createWorkspaceAction} from '../../services/projects';

export interface WorkspaceOption {
  workspaceId: string;
  name: string;
  role: string;
}

export function WorkspaceSwitcher(props: {workspaces: WorkspaceOption[]; activeWorkspaceId: string}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = props.workspaces.find((workspace) => workspace.workspaceId === props.activeWorkspaceId);

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
        aria-label="Workspace switcher"
        aria-expanded={open}
        className="max-w-[180px] truncate rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] hover:bg-[#1a3050]"
      >
        {active?.name ?? 'Workspace'} ▾
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-[#2a4568] bg-[#0f1c30] p-3 shadow-xl">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#9fb2c8]">Workspaces</p>
          <div className="flex flex-col gap-1">
            {props.workspaces.map((workspace) => (
              <button
                key={workspace.workspaceId}
                type="button"
                disabled={pending || workspace.workspaceId === props.activeWorkspaceId}
                onClick={() => run(() => setActiveWorkspaceAction(workspace.workspaceId))}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  workspace.workspaceId === props.activeWorkspaceId
                    ? 'bg-[#1a3050] text-[#59d5e0]'
                    : 'text-[#f8fafc] hover:bg-[#1a3050]'
                }`}
              >
                <span className="truncate">{workspace.name}</span>
                <span className="text-[10px] text-[#64748b]">{workspace.role}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 border-t border-[#2a4568] pt-3">
            {creating ? (
              <div className="flex flex-col gap-2">
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  aria-label="New workspace name"
                  placeholder="Workspace name"
                  className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#59d5e0]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await createWorkspaceAction(newName);
                        setCreating(false);
                        setNewName('');
                      })
                    }
                    className="rounded bg-[#59d5e0] px-3 py-1.5 text-xs font-semibold text-[#08111f] disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button type="button" onClick={() => setCreating(false)} className="rounded border border-[#2a4568] px-3 py-1.5 text-xs text-[#9fb2c8]">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-left text-sm text-[#59d5e0] hover:bg-[#1a3050]"
              >
                + New workspace
              </button>
            )}
            {error ? <p className="mt-2 text-xs text-[#fb7185]">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
