import {Card, CardHeader, StatusPill} from '@motionknowledge/ui';
import {getServiceDb} from '../../../lib/db';
import {getSessionUser} from '../../../lib/supabase/auth';
import {getWorkspaceMemberships} from '../../../services/projects';

export default async function SettingsPage() {
  const user = await getSessionUser();
  const db = getServiceDb();
  const memberships = user ? await getWorkspaceMemberships(user.id, db) : [];

  const providers = [
    {name: 'llm', configured: Boolean(process.env.OPENAI_API_KEY), detail: process.env.OPENAI_API_KEY ? 'openai' : 'mock (deterministic)'},
    {name: 'tts', configured: Boolean(process.env.GOOGLE_TTS_CREDENTIALS_JSON || process.env.ELEVENLABS_API_KEY), detail: process.env.GOOGLE_TTS_CREDENTIALS_JSON ? 'google' : process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'mock (deterministic)'},
    {name: 'storage', configured: true, detail: process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local'},
    {name: 'hyperframes', configured: true, detail: process.env.HYPERFRAMES_RENDER_IMAGE ?? 'motionknowledge-hyperframes:0.7.107'},
  ];

  return (
    <div className="mx-auto max-w-2xl">
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
          <CardHeader title="Workspace" subtitle="Your membership and plan." />
          {memberships.length === 0 ? (
            <p className="text-sm text-[#9fb2c8]">No workspace yet — create a project to get started.</p>
          ) : (
            memberships.map((membership) => (
              <div key={membership.workspaceId} className="flex items-center justify-between">
                <div className="text-[#f8fafc]">{membership.workspaceId}</div>
                <StatusPill status={membership.role === 'owner' ? 'succeeded' : 'running'} />
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
