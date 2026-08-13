export interface UsageView {
  totalCostUsd: string;
  byOperation: Array<{operation: string; costUsd: string}>;
  eventCount: number;
}

export function UsageSummary({usage}: {usage: UsageView}) {
  return (
    <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[#f8fafc]">Internal provider cost</h3>
      <p className="text-2xl font-bold text-[#59d5e0]">${usage.totalCostUsd}</p>
      <p className="text-xs text-[#9fb2c8]">internal cost only — customer credits are tracked separately</p>
      {usage.byOperation.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-[#9fb2c8]">
          {usage.byOperation.map((item) => (
            <li key={item.operation} className="flex justify-between">
              <span>{item.operation.replace(/_/g, ' ')}</span>
              <span>${item.costUsd}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
