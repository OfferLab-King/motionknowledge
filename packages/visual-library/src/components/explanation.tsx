import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import type {Theme} from '../theme';
import {SafeArea, Kicker, Panel, TruncatedText} from '../layout';
import {useReveal, useSequencedReveal, useProgress, useEasing} from '../motion';
import {BulletDot, FlowArrow, surfaceStyle, StatChip} from '../styling';
import {SketchBox, MarkerHighlight, HandUnderline, useDrawProgress} from './variants';

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
        <div style={{fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: theme.typography.heading, color: theme.colors.accent}}>{data.term}</div>
        <TruncatedText text={data.definition} theme={theme} maxLines={4} />
        {data.example ? (
          <div style={{opacity: ex.opacity, marginTop: theme.spacing.sm, fontSize: theme.typography.subheading, color: theme.colors.muted}}>
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
  const r = useReveal({startFrame: 0, type: theme.motion.reveal});
  return (
    <SafeArea theme={theme}>
      <div style={{opacity: r.opacity, transform: `translateY(${r.translateY}px)`}}>
        {data.title ? (
          <div style={{fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: theme.typography.heading, color: theme.colors.text}}>{data.title}</div>
        ) : null}
        <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.md, marginTop: theme.spacing.lg}}>
          {data.bullets.slice(0, 6).map((bullet, i) => {
            const s = useSequencedReveal(i, 10, theme.motion.spring);
            return (
              <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, display: 'flex', gap: theme.spacing.md, alignItems: 'flex-start'}}>
                <div style={{marginTop: theme.visualLanguage === 'minimal' ? 14 : 4}}>
                  <BulletDot theme={theme} index={i} />
                </div>
                <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, fontFamily: theme.fonts.body}}>{bullet}</div>
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
      <div style={{display: 'flex', gap: theme.spacing.xl, marginTop: theme.spacing.lg, justifyContent: 'center', flexWrap: 'wrap'}}>
        {data.items.slice(0, 4).map((item, i) => {
          const side = i < mid ? -1 : 1;
          const offset = interpolate(spread, [0, 1], [0, side * 40]);
          const left = i % 2 === 0;
          return (
            <Panel key={i} theme={theme} seed={i} style={{transform: `translateY(${offset}px)`, width: 340, borderTop: `${theme.borders.width * 2}px solid ${left ? theme.colors.primary : theme.colors.accent}`}}>
              <div style={{fontSize: theme.typography.subheading, color: left ? theme.colors.primary : theme.colors.accent, fontWeight: 700, fontFamily: theme.fonts.heading}}>{item.name}</div>
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
      <div style={{fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: theme.typography.heading, color: theme.colors.text, textAlign: 'center'}}>{data.title}</div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.xl, marginTop: theme.spacing.lg}}>
        <Panel theme={theme} style={{borderLeft: `6px solid ${theme.colors.success}`}}>
          <Kicker text="Pros" theme={theme} />
          {pros.map((item, i) => {
            const s = useSequencedReveal(i, 10, theme.motion.spring);
            return (
              <div key={i} style={{opacity: s.opacity, fontSize: theme.typography.subheading, color: theme.colors.text}}>
                <span style={{color: theme.colors.success}}>+ </span>
                {item}
              </div>
            );
          })}
        </Panel>
        <Panel theme={theme} style={{borderLeft: `6px solid ${theme.colors.danger}`}}>
          <Kicker text="Cons" theme={theme} />
          {cons.map((item, i) => {
            const s = useSequencedReveal(i, 10, theme.motion.spring);
            return (
              <div key={i} style={{opacity: s.opacity, fontSize: theme.typography.subheading, color: theme.colors.text}}>
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
          const s = useSequencedReveal(i, 10, theme.motion.spring);
          const active = i < events.length * progress || progress >= 1;
          return (
            <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, display: 'flex', gap: theme.spacing.md, alignItems: 'center'}}>
              {theme.visualLanguage === 'hand-drawn' ? (
                <div style={{width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg width={30} height={30} viewBox="0 0 30 30">
                    <ellipse cx={15 + Math.sin(i * 7.3) * 1.2} cy={15 + Math.cos(i * 4.1) * 1.2} rx={11} ry={11} fill={active ? theme.colors.primary : 'none'} stroke={theme.colors.primary} strokeWidth={2.5} transform={`rotate(${i % 2 === 0 ? -5 : 5} 15 15)`} />
                  </svg>
                </div>
              ) : (
                <div style={{width: 26, height: 26, borderRadius: 13, background: active ? theme.colors.primary : theme.colors.surface, border: `3px solid ${theme.colors.primary}`}} />
              )}
              <div style={{width: 2, height: 44, background: theme.colors.surfaceAlt, opacity: i === events.length - 1 ? 0 : 1}} />
              <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, fontFamily: theme.fonts.body}}>
                {event.label}
                {event.caption ? <span style={{color: theme.colors.muted, fontSize: theme.typography.caption}}> — {event.caption}</span> : null}
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
          const s = useSequencedReveal(i, 6, theme.motion.spring);
          const height = interpolate((progress * Math.abs(period.amount)) / max, [0, 1], [0, 380], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const color = period.type === 'inflow' ? theme.colors.primary : theme.colors.danger;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1}}>
              <div style={{color, fontSize: theme.typography.caption, fontWeight: 700, marginBottom: 8, minHeight: 32}}>{period.displayAmount}</div>
              <div style={{width: 56, height, background: color, borderRadius: theme.radius.sm, minHeight: 4, opacity: 0.9}} />
              <div style={{marginTop: 12, fontSize: theme.typography.caption, color: theme.colors.muted}}>{period.label}</div>
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

/**
 * The reference multi-variant semantic component: one component, six visual
 * treatments, selected by the style's `visualLanguage`.
 */
export function ProcessFlow({data, theme}: VisualComponentProps<z.infer<typeof ProcessFlowProps>>) {
  const steps = data.steps.slice(0, 5);
  const frame = useCurrentFrame();
  const progress = useEasing(0, 50);
  const language = theme.visualLanguage;
  const variant = theme.variants['process-flow'] ?? language;

  if (variant === 'hand-drawn' || language === 'hand-drawn') {
    return <HandDrawnProcessFlow data={data} steps={steps} theme={theme} progress={progress} />;
  }
  if (variant === 'structured' || language === 'structured') {
    return <StructuredProcessFlow data={data} steps={steps} theme={theme} progress={progress} />;
  }
  if (variant === 'infographic' || language === 'infographic') {
    return <InfographicProcessFlow data={data} steps={steps} theme={theme} progress={progress} />;
  }
  if (variant === 'business' || language === 'business') {
    return <BusinessProcessFlow data={data} steps={steps} theme={theme} progress={progress} />;
  }
  if (variant === 'minimal' || language === 'minimal') {
    return <MinimalProcessFlow data={data} steps={steps} theme={theme} progress={progress} />;
  }
  return <PolishedProcessFlow data={data} steps={steps} theme={theme} progress={progress} />;
}

function PolishedProcessFlow({data, steps, theme, progress}: {data: {title: string}; steps: string[]; theme: Theme; progress: number}) {
  return (
    <SafeArea theme={theme}>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <Kicker text={data.title} theme={theme} />
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginTop: theme.spacing.xl}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 8, theme.motion.spring);
          const active = progress > i / steps.length;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', alignItems: 'center'}}>
              <Panel theme={theme} style={{width: 260, height: 150, justifyContent: 'center', borderTop: `4px solid ${active ? theme.colors.accent : theme.colors.surfaceAlt}`, textAlign: 'center'}}>
                <div style={{fontSize: theme.typography.caption, color: theme.colors.muted}}>Step {i + 1}</div>
                <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, marginTop: 6, fontFamily: theme.fonts.body}}>{step}</div>
              </Panel>
              {i < steps.length - 1 ? <FlowArrow theme={theme} active={active} seed={i + 1} /> : null}
            </div>
          );
        })}
      </div>
    </SafeArea>
  );
}

function HandDrawnProcessFlow({data, steps, theme, progress}: {data: {title: string}; steps: string[]; theme: Theme; progress: number}) {
  return (
    <SafeArea theme={theme}>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <Kicker text={data.title} theme={theme} />
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: theme.spacing.xl}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 10, theme.motion.spring);
          const active = progress > i / steps.length;
          const seed = i * 7 + 2;
          const draw = useDrawProgress(6 + i * 4, 26);
          const rotation = i % 2 === 0 ? -1.2 : 1.1;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', alignItems: 'center'}}>
              <div style={{position: 'relative', width: 250, height: 140, transform: `rotate(${rotation}deg)`}}>
                <SketchBox
                  theme={theme}
                  seed={seed}
                  width={250}
                  height={140}
                  x={0}
                  y={0}
                  color={active ? theme.colors.primary : theme.colors.muted}
                  progress={draw}
                  strokeWidth={3}
                >
                  <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 14}}>
                    <div style={{fontSize: 20, color: theme.colors.muted, fontFamily: theme.fonts.heading}}>{active ? `Step ${i + 1}` : `Step ${i + 1}`}</div>
                    <div style={{fontSize: 26, color: theme.colors.text, textAlign: 'center', marginTop: 4, fontFamily: theme.fonts.heading, lineHeight: 1.2}}>{step}</div>
                  </div>
                </SketchBox>
                <MarkerHighlight theme={theme} width={120} height={14} opacity={active ? 0.4 : 0.15} startFrame={20 + i * 4} durationFrames={14} style={{top: 12, right: -8}} />
              </div>
              {i < steps.length - 1 ? <FlowArrow theme={theme} active={active} width={54} seed={i + 9} /> : null}
            </div>
          );
        })}
      </div>
    </SafeArea>
  );
}

function StructuredProcessFlow({data, steps, theme, progress}: {data: {title: string}; steps: string[]; theme: Theme; progress: number}) {
  return (
    <SafeArea theme={theme}>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <Kicker text={data.title} theme={theme} />
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: theme.spacing.xl}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 8, theme.motion.spring);
          const active = progress > i / steps.length;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', alignItems: 'center'}}>
              <div
                style={{
                  ...surfaceStyle(theme),
                  width: 250,
                  height: 150,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  borderTop: `5px solid ${active ? theme.colors.primary : theme.colors.surfaceAlt}`,
                  boxShadow: theme.shadows.md,
                  background: active ? theme.colors.surface : theme.colors.surfaceAlt,
                }}
              >
                <div style={{fontSize: theme.typography.caption, color: active ? theme.colors.primary : theme.colors.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1}}>
                  Step {i + 1}
                </div>
                <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, marginTop: 8, fontFamily: theme.fonts.heading}}>{step}</div>
              </div>
              {i < steps.length - 1 ? <FlowArrow theme={theme} active={active} width={48} /> : null}
            </div>
          );
        })}
      </div>
    </SafeArea>
  );
}

function InfographicProcessFlow({data, steps, theme, progress}: {data: {title: string}; steps: string[]; theme: Theme; progress: number}) {
  return (
    <SafeArea theme={theme}>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <Kicker text={data.title} theme={theme} />
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginTop: theme.spacing.xl}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 7, theme.motion.spring);
          const active = progress > i / steps.length;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', alignItems: 'center'}}>
              <div
                style={{
                  width: 240,
                  height: 150,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active ? theme.colors.primary : theme.colors.surface,
                  border: `${theme.borders.width * 2}px solid ${theme.colors.primary}`,
                  borderRadius: 0,
                  position: 'relative',
                }}
              >
                <div style={{position: 'absolute', top: -1, right: -1, width: 28, height: 28, background: theme.colors.accent, color: theme.colors.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, fontFamily: theme.fonts.heading}}>
                  {i + 1}
                </div>
                <div style={{fontSize: theme.typography.subheading, fontWeight: 800, color: active ? theme.colors.onAccent : theme.colors.text, textAlign: 'center', padding: '0 16px', fontFamily: theme.fonts.heading, textTransform: 'uppercase'}}>
                  {step}
                </div>
              </div>
              {i < steps.length - 1 ? <FlowArrow theme={theme} active={active} width={44} /> : null}
            </div>
          );
        })}
      </div>
    </SafeArea>
  );
}

function BusinessProcessFlow({data, steps, theme, progress}: {data: {title: string}; steps: string[]; theme: Theme; progress: number}) {
  return (
    <SafeArea theme={theme}>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <Kicker text={data.title} theme={theme} />
      </div>
      <div style={{display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 6, marginTop: theme.spacing.xl}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 8, theme.motion.spring);
          const active = progress > i / steps.length;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', alignItems: 'center'}}>
              <div
                style={{
                  ...surfaceStyle(theme),
                  width: 230,
                  minHeight: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: `${theme.spacing.md}px ${theme.spacing.sm}px`,
                  borderRadius: theme.radius.sm,
                  borderLeft: `3px solid ${active ? theme.colors.primary : theme.colors.surfaceAlt}`,
                  background: active ? theme.colors.surface : theme.colors.surfaceAlt,
                }}
              >
                <div style={{fontSize: theme.typography.caption, color: active ? theme.colors.primary : theme.colors.muted, fontWeight: 600, letterSpacing: 0.5}}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, marginTop: 6, fontFamily: theme.fonts.heading}}>{step}</div>
              </div>
              {i < steps.length - 1 ? <FlowArrow theme={theme} active={active} width={30} /> : null}
            </div>
          );
        })}
      </div>
    </SafeArea>
  );
}

function MinimalProcessFlow({data, steps, theme, progress}: {data: {title: string}; steps: string[]; theme: Theme; progress: number}) {
  return (
    <SafeArea theme={theme}>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <Kicker text={data.title} theme={theme} />
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: theme.spacing.xl}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 10, theme.motion.spring);
          const active = progress > i / steps.length;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', alignItems: 'center'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 220, padding: theme.spacing.md, textAlign: 'center'}}>
                <div style={{fontSize: 40, fontWeight: 300, color: active ? theme.colors.primary : theme.colors.muted, fontFamily: theme.fonts.heading, marginBottom: theme.spacing.sm}}>
                  {i + 1}
                </div>
                <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, fontWeight: 500, fontFamily: theme.fonts.body, lineHeight: 1.3}}>{step}</div>
              </div>
              {i < steps.length - 1 ? <FlowArrow theme={theme} active={active} width={36} /> : null}
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
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  return (
    <SafeArea theme={theme}>
      <Kicker text={data.title} theme={theme} />
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.lg}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 10, theme.motion.spring);
          const active = progress > i / steps.length;
          return (
            <div key={i} style={{opacity: s.opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
              {handDrawn ? (
                <div style={{position: 'relative', width: 460, height: 84}}>
                  <SketchBox
                    theme={theme}
                    seed={i * 13 + 5}
                    width={460}
                    height={84}
                    color={active ? theme.colors.primary : theme.colors.muted}
                    startFrame={4 + i * 6}
                    durationFrames={26}
                  >
                    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: theme.typography.subheading, color: theme.colors.text, fontFamily: theme.fonts.heading}}>
                      {step}
                    </div>
                  </SketchBox>
                </div>
              ) : (
                <div
                  style={{
                    border: `${theme.borders.width * 2}px solid ${active ? theme.colors.primary : theme.colors.surfaceAlt}`,
                    borderRadius: i === steps.length - 1 ? theme.radius.lg : theme.radius.md,
                    padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
                    fontSize: theme.typography.subheading,
                    color: theme.colors.text,
                    background: active ? theme.colors.surface : 'transparent',
                    minWidth: 460,
                    textAlign: 'center',
                    fontFamily: theme.fonts.body,
                  }}
                >
                  {step}
                </div>
              )}
              {i < steps.length - 1 ? (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <div style={{width: 3, height: 40, background: theme.colors.primary, opacity: active ? 1 : 0.2}} />
                  {data.branchLabels[i] ? (
                    <div style={{fontSize: theme.typography.caption, color: theme.colors.accent, position: 'relative', right: 60, top: -30}}>{data.branchLabels[i]}</div>
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
