import {Card, CardHeader, StatusPill} from '@motionknowledge/ui';
import {getServiceDb} from '../../../lib/db';
import {getSessionUser} from '../../../lib/supabase/auth';
import {getWorkspaceMemberships} from '../../../services/projects';
import {listStyles} from '@motionknowledge/visual-library/style';
import {StylePreview} from '../../../components/projects/StylePreview';
import {UsageLedgerImpl} from '@motionknowledge/usage';
import {subscriptions, workspaceMemberships, workspaces} from '@motionknowledge/database';
import {eq} from 'drizzle-orm';
import {resolveWorkspaceId} from '../../../services/projects';
import {WorkspaceMembers} from '../../../components/shell/WorkspaceMembers';

export default async function SettingsPage() {
  const user = await getSessionUser();
  const db = getServiceDb();
  const memberships = user ? await getWorkspaceMemberships(user.id, db) : [];

  const workspaceId = await resolveWorkspaceId(db, user?.id ?? '');
  const plan = workspaceId ? (await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).limit(1))[0] : null;
  const creditBalance = workspaceId ? await new UsageLedgerImpl(db).creditBalance(workspaceId) : 0;
  const memberRows = workspaceId
    ? await db
        .select({userId: workspaceMemberships.userId, role: workspaceMemberships.role})
        .from(workspaceMemberships)
        .where(eq(workspaceMemberships.workspaceId, workspaceId))
    : [];
  const memberEmails = new Map<string, string>();
  for (const member of memberRows) {
    const rows = await db.execute((await import('drizzle-orm')).sql.raw(`select email from auth.users where id = '${member.userId}' limit 1`));
    memberEmails.set(String(member.userId), String((rows[0] as {email?: string} | undefined)?.email ?? 'unknown'));
  }
  const workspace = workspaceId ? (await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1))[0] : null;
  const isOwner = memberRows.find((member) => String(member.userId) === user?.id)?.role === 'owner';

  const providers = [
    {name: 'llm', configured: Boolean(process.env.OPENAI_API_KEY), detail: process.env.OPENAI_API_KEY ? 'openai' : 'mock (deterministic)'},
    {name: 'tts', configured: Boolean(process.env.GOOGLE_TTS_CREDENTIALS_JSON || process.env.ELEVENLABS_API_KEY), detail: process.env.GOOGLE_TTS_CREDENTIALS_JSON ? 'google' : process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'mock (deterministic)'},
    {name: 'storage', configured: true, detail: process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local'},
    {name: 'hyperframes', configured: true, detail: process.env.HYPERFRAMES_RENDER_IMAGE ?? 'motionknowledge-hyperframes:0.7.107'},
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-2xl font-bold text-[#f8fafc]">Settings</h1>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Providers" subtitle="Configured providers are reported without secrets." />
          <div className="space-y-3">
            {providers.map((provider) => {
              const active = provider.configured || provider.detail.includes('mock');
              const label = provider.configured ? 'configured' : provider.detail.includes('mock') ? 'active (mock)' : 'not configured';
              return (
                <div key={provider.name} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#f8fafc]">{provider.name}</div>
                    <div className="text-sm text-[#9fb2c8]">{provider.detail}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${active ? 'bg-[#10213a] text-[#4ade80]' : 'bg-[#10213a] text-[#fb7185]'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Plan and credits" subtitle="Credits are consumed by paid operations (LLM, TTS, renders)." />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-[#f8fafc]">Plan</div>
                <div className="text-sm text-[#9fb2c8]">{plan?.plan ?? 'free'} · {plan?.status ?? 'free'}</div>
              </div>
              <span className="rounded-full bg-[#10213a] px-3 py-1 text-xs font-medium text-[#4ade80]">
                {creditBalance.toLocaleString()} credits
              </span>
            </div>
            <p className="text-xs text-[#9fb2c8]">
              A final render costs 1 credit; LLM and TTS operations deduct their estimated cost. Free
              workspaces start with 5,000 credits.
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader title={`Workspace: ${workspace?.name ?? '—'}`} subtitle="Members can create projects in this workspace." />
          {workspaceId ? (
            <WorkspaceMembers
              workspaceId={workspaceId}
              isOwner={isOwner}
              members={memberRows.map((member) => ({
                userId: String(member.userId),
                email: memberEmails.get(String(member.userId)) ?? 'unknown',
                role: member.role,
                isSelf: String(member.userId) === user?.id,
              }))}
            />
          ) : (
            <p className="text-sm text-[#9fb2c8]">No workspace yet — create a project to get started.</p>
          )}
        </Card>
        <Card>
          <CardHeader title="Style previews" subtitle="The same miniature explanation rendered deterministically in every registered style." />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {listStyles().map((style) => (
              <div key={style.id} className="overflow-hidden rounded-lg border border-[#2a4568]">
                <StylePreview styleId={style.id} width={200} height={113} />
                <div className="bg-[#0f1c30] px-2 py-2">
                  <div className="text-xs font-semibold text-[#f8fafc]">{style.name}</div>
                  <div className="text-[10px] text-[#9fb2c8]">v{style.version}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
