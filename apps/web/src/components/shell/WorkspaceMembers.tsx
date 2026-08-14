'use client';

import {useState, useTransition} from 'react';
import {inviteToWorkspaceAction, removeMemberAction} from '../../services/projects';

export interface MemberView {
  userId: string;
  email: string;
  role: string;
  isSelf: boolean;
}

export function WorkspaceMembers(props: {workspaceId: string; members: MemberView[]; isOwner: boolean}) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function invite() {
    setError(null);
    setDone(false);
    setInviting(true);
    startTransition(async () => {
      try {
        await inviteToWorkspaceAction(props.workspaceId, email);
        setDone(true);
        setEmail('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invite failed');
      } finally {
        setInviting(false);
      }
    });
  }

  function remove(userId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await removeMemberAction(props.workspaceId, userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Remove failed');
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="space-y-2">
        {props.members.map((member) => (
          <li key={member.userId} className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-[#f8fafc]">{member.email}</div>
              <div className="text-xs text-[#9fb2c8]">{member.role}</div>
            </div>
            {props.isOwner && !member.isSelf ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(member.userId)}
                className="rounded bg-[#1a0f1f] px-2 py-1 text-xs font-semibold text-[#fb7185] hover:bg-[#2a1520] disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {props.isOwner ? (
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-label="Invite email"
            type="email"
            placeholder="user@example.com"
            className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#59d5e0]"
          />
          <button
            type="button"
            disabled={inviting || pending}
            onClick={invite}
            className="shrink-0 rounded bg-[#59d5e0] px-3 py-2 text-sm font-semibold text-[#08111f] disabled:opacity-50"
          >
            Invite
          </button>
        </div>
      ) : null}
      {done ? <p className="text-xs text-[#4ade80]">Invited — the user will see the workspace in their switcher.</p> : null}
      {error ? <p className="text-xs text-[#fb7185]">{error}</p> : null}
    </div>
  );
}
