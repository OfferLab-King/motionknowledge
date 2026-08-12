import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import {fonts, type Theme} from '../theme';
import {SafeArea, Kicker, Panel, TruncatedText} from '../layout';
import {useReveal, useSequencedReveal, useProgress, useEasing} from '../motion';

export const DefinitionCardProps = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  example: z.string().default(''),
});

export function DefinitionCard({data, theme}: VisualComponentProps<z.infer<typeof DefinitionCardProps>>) {
  const r = useReveal({startFrame: 0, type: 'scale'});
  const ex = useReveal({startFrame: 20});
  return (
    <SafeArea theme={theme} center>
      <Panel theme={theme} style={{opacity: r.opacity, transform: `scale(${r.scale})`, maxWidth: 1500, gap: theme.spacing.sm}}>
        <Kicker text="Definition" theme={theme} />
        <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 60, color: theme.colors.accent}}>{data.term}</div>
        <TruncatedText text={data.definition} theme={theme} maxLines={4} />
        {data.example ? (
          <div style={{opacity: ex.opacity, marginTop: theme.spacing.sm, fontSize: 26, color: theme.colors.muted}}>
            <span style={{color: theme.colors.primary}}>Example: </span>
            {data.example}
          </div>
        ) : null}
      </Panel>
    </SafeArea>
  );
}

export const BulletRevealProps = z.object({
  title: z.string().default(''),
  bullets: z.array(z.string()).min(1),
});

export function BulletReveal({data, theme}: VisualComponentProps<z.infer<typeof BulletRevealProps>>) {
  const r = useReveal({startFrame: 0});
  return (
    <SafeArea theme={theme}>
      <div style={{opacity: r.opacity}}>
        {data.title ? (
          <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 56, color: theme.colors.text}}>{data.title}</div>
        ) : null}
        <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.md, marginTop: theme.spacing.lg}}>
          {data.bullets.slice(0, 6).map((bullet, i) => {
            const s = useSequencedReveal(i);
            return (
              <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, display: 'flex', gap: theme.spacing.md, alignItems: 'flex-start'}}>
                <div style={{width: 14, height: 14, borderRadius: 7, background: theme.colors.primary, marginTop: 10}} />
                <div style={{fontSize: 32, color: theme.colors.text}}>{bullet}</div>
              </div>
            );
          })}
        </div>
      </div>
    </SafeArea>
  );
}

export const ComparisonProps = z.object({
  title: z.string().default(''),
  items: z.array(z.object({name: z.string(), value: z.string()})).min(2),
});

export function Comparison({data, theme}: VisualComponentProps<z.infer<typeof ComparisonProps>>) {
  const frame = useCurrentFrame();
  const spread = interpolate(frame, [15, 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const mid = Math.ceil(data.items.length / 2);
  return (
    <SafeArea theme={theme}>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <Kicker text={data.title || 'Comparison'} theme={theme} />
      </div>
      <div style={{display: 'flex', gap: theme.spacing.xl, marginTop: theme.spacing.lg, justifyContent: 'center'}}>
        {data.items.slice(0, 4).map((item, i) => {
          const side = i < mid ? -1 : 1;
          const offset = interpolate(spread, [0, 1], [0, side * 40]);
          const left = i % 2 === 0;
          return (
            <Panel key={i} theme={theme} style={{transform: `translateY(${offset}px)`, width: 340, borderTop: `6px solid ${left ? theme.colors.primary : theme.colors.accent}`}}>
              <div style={{fontSize: 30, color: left ? theme.colors.primary : theme.colors.accent, fontWeight: 700, fontFamily: fonts.heading}}>{item.name}</div>
              <TruncatedText text={item.value} theme={theme} maxLines={4} />
            </Panel>
          );
        })}
      </div>
    </SafeArea>
  );
}

export const ProsConsProps = z.object({
  title: z.string().default('Trade-offs'),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
});

export function ProsCons({data, theme}: VisualComponentProps<z.infer<typeof ProsConsProps>>) {
  const frame = useCurrentFrame();
  const w = useProgress(0, 40);
  const pros = data.pros.slice(0, 4);
  const cons = data.cons.slice(0, 4);
  return (
    <SafeArea theme={theme}>
      <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 56, color: theme.colors.text, textAlign: 'center'}}>{data.title}</div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.xl, marginTop: theme.spacing.lg}}>
        <Panel theme={theme} style={{borderLeft: `6px solid #4ADE80`}}>
          <Kicker text="Pros" theme={theme} />
          {pros.map((item, i) => {
            const s = useSequencedReveal(i);
            return (
              <div key={i} style={{opacity: s.opacity, fontSize: 28, color: theme.colors.text}}>
                <span style={{color: '#4ADE80'}}>+ </span>
                {item}
              </div>
            );
          })}
        </Panel>
        <Panel theme={theme} style={{borderLeft: `6px solid ${theme.colors.danger}`}}>
          <Kicker text="Cons" theme={theme} />
          {cons.map((item, i) => {
            const s = useSequencedReveal(i);
            return (
              <div key={i} style={{opacity: s.opacity, fontSize: 28, color: theme.colors.text}}>
                <span style={{color: theme.colors.danger}}>− </span>
                {item}
              </div>
            );
          })}
        </Panel>
      </div>
      <div style={{height: 4, background: theme.colors.primary, transform: `scaleX(${w})`, transformOrigin: 'left'}} />
    </SafeArea>
  );
}

export const TimelineProps = z.object({
  title: z.string().default('Timeline'),
  events: z.array(z.object({label: z.string(), caption: z.string()})).min(1),
});

export function Timeline({data, theme}: VisualComponentProps<z.infer<typeof TimelineProps>>) {
  const frame = useCurrentFrame();
  const progress = useEasing(0, 45);
  const events = data.events.slice(0, 6);
  return (
    <SafeArea theme={theme}>
      <Kicker text={data.title} theme={theme} />
      <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.md, marginTop: theme.spacing.lg}}>
        {events.map((event, i) => {
          const s = useSequencedReveal(i);
          const active = i < events.length * progress || progress >= 1;
          return (
            <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, display: 'flex', gap: theme.spacing.md, alignItems: 'center'}}>
              <div style={{width: 26, height: 26, borderRadius: 13, background: active ? theme.colors.primary : theme.colors.surface, border: `3px solid ${theme.colors.primary}`}} />
              <div style={{width: 2, height: 44, background: theme.colors.surface, opacity: i === events.length - 1 ? 0 : 1}} />
              <div style={{fontSize: 32, color: theme.colors.text}}>
                {event.label}
                {event.caption ? <span style={{color: theme.colors.muted, fontSize: 24}}> — {event.caption}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </SafeArea>
  );
}

export const CashflowTimelineProps = z.object({
  title: z.string().default('Cash flows'),
  periods: z
    .array(
      z.object({
        year: z.number().int(),
        label: z.string(),
        amount: z.number(),
        displayAmount: z.string(),
        type: z.enum(['inflow', 'outflow']).default('inflow'),
      }),
    )
    .min(1),
});

export function CashflowTimeline({data, theme}: VisualComponentProps<z.infer<typeof CashflowTimelineProps>>) {
  const frame = useCurrentFrame();
  const years = data.periods.slice(0, 6);
  const max = Math.max(...years.map((p) => Math.abs(p.amount)), 1);
  const progress = useEasing(10, 40);
  return (
    <SafeArea theme={theme}>
      <Kicker text={data.title} theme={theme} />
      <div style={{display: 'flex', alignItems: 'flex-end', gap: theme.spacing.md, marginTop: theme.spacing.xl, height: 420}}>
        {years.map((period, i) => {
          const s = useSequencedReveal(i, 6);
          const height = interpolate(progress * Math.abs(period.amount) / max, [0, 1], [0, 380], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const color = period.type === 'inflow' ? theme.colors.primary : theme.colors.danger;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1}}>
              <div style={{color, fontSize: 26, fontWeight: 700, marginBottom: 8, minHeight: 36}}>{period.displayAmount}</div>
              <div style={{width: 56, height, background: color, borderRadius: theme.radius.sm, minHeight: 4, opacity: 0.9}} />
              <div style={{marginTop: 12, fontSize: 24, color: theme.colors.muted}}>{period.label}</div>
            </div>
          );
        })}
      </div>
    </SafeArea>
  );
}

export const ProcessFlowProps = z.object({
  title: z.string().default('Process'),
  steps: z.array(z.string()).min(1),
});

export function ProcessFlow({data, theme}: VisualComponentProps<z.infer<typeof ProcessFlowProps>>) {
  const frame = useCurrentFrame();
  const steps = data.steps.slice(0, 5);
  const progress = useEasing(0, 50);
  return (
    <SafeArea theme={theme}>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <Kicker text={data.title} theme={theme} />
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginTop: theme.spacing.xl}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 8);
          const active = progress > i / steps.length;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', alignItems: 'center'}}>
              <Panel theme={theme} style={{width: 260, height: 150, justifyContent: 'center', borderTop: `4px solid ${active ? theme.colors.accent : theme.colors.surface}`, textAlign: 'center'}}>
                <div style={{fontSize: 26, color: theme.colors.muted}}>Step {i + 1}</div>
                <div style={{fontSize: 28, color: theme.colors.text, marginTop: 6}}>{step}</div>
              </Panel>
              {i < steps.length - 1 ? (
                <div style={{width: 70, height: 3, background: theme.colors.primary, opacity: active ? 1 : 0.3}} />
              ) : null}
            </div>
          );
        })}
      </div>
    </SafeArea>
  );
}

export const FlowChartProps = z.object({
  title: z.string().default('Flow chart'),
  steps: z.array(z.string()).min(1),
  branchLabels: z.array(z.string()).default([]),
});

export function FlowChart({data, theme}: VisualComponentProps<z.infer<typeof FlowChartProps>>) {
  const frame = useCurrentFrame();
  const progress = useEasing(0, 55);
  const steps = data.steps.slice(0, 4);
  return (
    <SafeArea theme={theme}>
      <Kicker text={data.title} theme={theme} />
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.lg}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 10);
          const active = progress > i / steps.length;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
              <div style={{border: `3px solid ${active ? theme.colors.primary : theme.colors.surface}`, borderRadius: i === steps.length - 1 ? theme.radius.lg : theme.radius.md, padding: `${theme.spacing.md}px ${theme.spacing.lg}px`, fontSize: 30, color: theme.colors.text, background: active ? theme.colors.surface : 'transparent', minWidth: 420, textAlign: 'center'}}>
                {step}
              </div>
              {i < steps.length - 1 ? (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <div style={{width: 3, height: 40, background: theme.colors.primary, opacity: active ? 1 : 0.2}} />
                  {data.branchLabels[i] ? (
                    <div style={{fontSize: 22, color: theme.colors.accent, position: 'relative', right: 60, top: -30}}>{data.branchLabels[i]}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </SafeArea>
  );
}

export const BeforeAfterProps = z.object({
  title: z.string().default('Before / After'),
  before: z.string().min(1),
  after: z.string().min(1),
});

export function BeforeAfter({data, theme}: VisualComponentProps<z.infer<typeof BeforeAfterProps>>) {
  const frame = useCurrentFrame();
  const flip = interpolate(frame, [20, 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <SafeArea theme={theme} center>
      <Kicker text={data.title} theme={theme} />
      <div style={{display: 'flex', gap: theme.spacing.xl, marginTop: theme.spacing.lg, alignItems: 'stretch'}}>
        <Panel theme={theme} style={{opacity: 1 - flip * 0.4, transform: `translateX(${-flip * 60}px)`, width: 620}}>
          <Kicker text="Before" theme={theme} />
          <TruncatedText text={data.before} theme={theme} maxLines={4} />
        </Panel>
        <div style={{display: 'flex', alignItems: 'center', fontSize: 56, color: theme.colors.primary}}>→</div>
        <Panel theme={theme} style={{opacity: 0.4 + flip * 0.6, transform: `translateX(${(1 - flip) * 60}px)`, width: 620, borderTop: `6px solid ${theme.colors.accent}`}}>
          <Kicker text="After" theme={theme} />
          <TruncatedText text={data.after} theme={theme} maxLines={4} />
        </Panel>
      </div>
    </SafeArea>
  );
}
