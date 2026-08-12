const statusStyles: Record<string, string> = {
  DRAFT: 'bg-[#10213a] text-[#9fb2c8]',
  RESEARCHING: 'bg-[#10213a] text-[#59d5e0]',
  OUTLINE_READY: 'bg-[#10213a] text-[#59d5e0]',
  SCRIPT_READY: 'bg-[#10213a] text-[#59d5e0]',
  STORYBOARD_READY: 'bg-[#10213a] text-[#59d5e0]',
  GENERATING: 'bg-[#10213a] text-[#f7c948]',
  PREVIEW_READY: 'bg-[#10213a] text-[#f7c948]',
  QA_FAILED: 'bg-[#10213a] text-[#fb7185]',
  READY_FOR_REVIEW: 'bg-[#10213a] text-[#4ade80]',
  APPROVED: 'bg-[#10213a] text-[#4ade80]',
  RENDERING: 'bg-[#10213a] text-[#f7c948]',
  COMPLETE: 'bg-[#10213a] text-[#4ade80]',
  queued: 'bg-[#10213a] text-[#9fb2c8]',
  running: 'bg-[#10213a] text-[#f7c948]',
  succeeded: 'bg-[#10213a] text-[#4ade80]',
  failed: 'bg-[#10213a] text-[#fb7185]',
};

export function StatusPill({status}: {status: string}) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusStyles[status] ?? 'bg-[#10213a] text-[#9fb2c8]'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
