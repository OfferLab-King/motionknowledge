import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import type {Theme} from '../theme';
import {SafeArea, Kicker, Panel, TruncatedText} from '../layout';
import {useReveal, useSequencedReveal, useProgress, useEasing} from '../motion';
import {MarkerHighlight, HandUnderline, SketchCircle, useDrawProgress} from './variants';

const ChartPoint = z.object({label: z.string(), value: z.number()});

function chartPalette(theme: Theme): string[] {
  return theme.colors.chartPalette;
}

function titleBlock(theme: Theme, title: string) {
  if (theme.visualLanguage === 'hand-drawn') {
    const draw = useDrawProgress(6, 22);
    return (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Kicker text={title} theme={theme} />
        <HandUnderline theme={theme} width={Math.min(320, title.length * 14)} color={theme.colors.primary} progress={draw} style={{marginTop: 4}} />
      </div>
    );
  }
  return <Kicker text={title} theme={theme} />;
}

export const BarChartProps = z.object({
  title: z.string().default('Bar chart'),
  series: z.array(ChartPoint).min(1),
  unit: z.string().default(''),
});

export function BarChart({data, theme}: VisualComponentProps<z.infer<typeof BarChartProps>>) {
  const frame = useCurrentFrame();
  const progress = useEasing(5, 40);
  const bars = data.series.slice(0, 8);
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), 1);
  const palette = chartPalette(theme);
  const radius = theme.visualLanguage === 'infographic' ? 0 : theme.radius.sm;
  return (
    <SafeArea theme={theme}>
      {titleBlock(theme, data.title)}
      <div style={{display: 'flex', alignItems: 'flex-end', gap: theme.spacing.md, marginTop: theme.spacing.xl, height: 430, borderBottom: `${theme.strokes.width}px ${theme.strokes.style} ${theme.colors.surfaceAlt}`}}>
        {bars.map((bar, i) => {
          const s = useSequencedReveal(i, 5, theme.motion.spring);
          const h = interpolate((progress * Math.abs(bar.value)) / max, [0, 1], [0, 390]);
          const color = palette[i % palette.length]!;
          return (
            <div key={i} style={{opacity: s.opacity, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end'}}>
              <div style={{fontSize: theme.typography.caption, color: theme.colors.muted, marginBottom: 6, fontFamily: theme.fonts.mono}}>
                {bar.value}
                {data.unit}
              </div>
              <div style={{width: '70%', height: Math.max(h, 4), background: theme.visualLanguage === 'minimal' ? theme.colors.primary : `linear-gradient(to top, ${color}, ${color}CC)`, borderRadius: radius, border: theme.visualLanguage === 'infographic' ? `2px solid ${theme.colors.primary}` : 'none'}} />
              <div style={{marginTop: 10, fontSize: theme.typography.caption, color: theme.colors.muted, whiteSpace: 'nowrap', fontFamily: theme.fonts.body}}>{bar.label}</div>
            </div>
          );
        })}
      </div>
    </SafeArea>
  );
}

export const LineChartProps = z.object({
  title: z.string().default('Line chart'),
  series: z.array(ChartPoint).min(2),
  unit: z.string().default(''),
});

export function LineChart({data, theme}: VisualComponentProps<z.infer<typeof LineChartProps>>) {
  const frame = useCurrentFrame();
  const progress = useEasing(5, 45);
  const points = data.series.slice(0, 12);
  const max = Math.max(...points.map((p) => p.value), 1);
  const w = 1500;
  const h = 420;
  const coords = points.map((p, i) => ({
    x: 40 + (i * (w - 80)) / Math.max(points.length - 1, 1),
    y: h - (p.value / max) * (h - 60) - 30,
  }));
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  const draw = useDrawProgress(10, 40);
  const dash = handDrawn ? {strokeDasharray: undefined as string | undefined, strokeDashoffset: undefined as string | undefined} : {strokeDasharray: `${coords.length * 60}`, strokeDashoffset: `${coords.length * 60 * (1 - progress)}`};
  return (
    <SafeArea theme={theme}>
      {titleBlock(theme, data.title)}
      <svg viewBox={`0 0 ${w} ${h}`} style={{marginTop: theme.spacing.lg, width: '100%', height: h}}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={40} x2={w - 40} y1={h - f * (h - 60)} y2={h - f * (h - 60)} stroke={theme.colors.surfaceAlt} strokeWidth={theme.strokes.width === 2 ? 2 : 2} strokeDasharray={theme.visualLanguage === 'minimal' ? '6 8' : undefined} />
        ))}
        <path d={path} fill="none" stroke={theme.colors.primary} strokeWidth={handDrawn ? 4 : 6} strokeLinecap="round" strokeLinejoin="round" {...dash} strokeDasharray={handDrawn ? `${(coords.length * 60).toFixed(0)}` : dash.strokeDasharray} strokeDashoffset={handDrawn ? `${(coords.length * 60 * (1 - draw)).toFixed(0)}` : dash.strokeDashoffset} />
        {coords.map((c, i) => {
          const s = useSequencedReveal(i, 3, theme.motion.spring);
          return handDrawn ? (
            <circle key={i} cx={c.x} cy={c.y} r={9} fill={theme.colors.accent} opacity={s.opacity * draw} />
          ) : (
            <circle key={i} cx={c.x} cy={c.y} r={7} fill={theme.colors.accent} opacity={s.opacity} stroke={theme.visualLanguage === 'minimal' ? theme.colors.background : 'none'} strokeWidth={2} />
          );
        })}
      </svg>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: theme.typography.caption, color: theme.colors.muted, fontFamily: theme.fonts.body}}>
        {points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </SafeArea>
  );
}

export const AreaChartProps = z.object({
  title: z.string().default('Area chart'),
  series: z.array(ChartPoint).min(2),
  unit: z.string().default(''),
});

export function AreaChart({data, theme}: VisualComponentProps<z.infer<typeof AreaChartProps>>) {
  const frame = useCurrentFrame();
  const progress = useEasing(5, 50);
  const points = data.series.slice(0, 12);
  const max = Math.max(...points.map((p) => p.value), 1);
  const w = 1500;
  const h = 420;
  const coords = points.map((p, i) => ({
    x: 40 + (i * (w - 80)) / Math.max(points.length - 1, 1),
    y: h - (p.value / max) * (h - 80) - 40,
  }));
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const area = `${line} L ${coords[coords.length - 1]!.x} ${h} L ${coords[0]!.x} ${h} Z`;
  const clip = useProgress(0, 50);
  return (
    <SafeArea theme={theme}>
      {titleBlock(theme, data.title)}
      <svg viewBox={`0 0 ${w} ${h}`} style={{marginTop: theme.spacing.lg, width: '100%', height: h}}>
        <defs>
          <clipPath id="area-clip">
            <rect x={0} y={0} width={w * clip} height={h} />
          </clipPath>
        </defs>
        <path d={area} fill={theme.colors.primary} opacity={0.25} clipPath="url(#area-clip)" />
        <path d={line} fill="none" stroke={theme.colors.primary} strokeWidth={6} strokeLinecap="round" clipPath="url(#area-clip)" />
      </svg>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: theme.typography.caption, color: theme.colors.muted, fontFamily: theme.fonts.body}}>
        {points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </SafeArea>
  );
}

export const DonutChartProps = z.object({
  title: z.string().default('Donut chart'),
  slices: z.array(z.object({label: z.string(), value: z.number(), color: z.string().optional()})).min(2),
});

export function DonutChart({data, theme}: VisualComponentProps<z.infer<typeof DonutChartProps>>) {
  const frame = useCurrentFrame();
  const progress = useEasing(5, 45);
  const slices = data.slices.slice(0, 6);
  const total = Math.max(slices.reduce((sum, s) => sum + s.value, 0), 1);
  const palette = chartPalette(theme);
  const r = 170;
  const cx = 260;
  const cy = 260;
  let angle = -90;
  const arcs: string[] = [];
  for (const [i, slice] of slices.entries()) {
    const sweep = (slice.value / total) * 360 * progress;
    const start = angle;
    const end = angle + sweep;
    angle += (slice.value / total) * 360;
    const large = end - start > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos((start * Math.PI) / 180);
    const y1 = cy + r * Math.sin((start * Math.PI) / 180);
    const x2 = cx + r * Math.cos((end * Math.PI) / 180);
    const y2 = cy + r * Math.sin((end * Math.PI) / 180);
    arcs.push(`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`);
    void i;
  }
  return (
    <SafeArea theme={theme} center>
      {titleBlock(theme, data.title)}
      <div style={{display: 'flex', gap: theme.spacing.xl, alignItems: 'center', marginTop: theme.spacing.lg}}>
        <svg width={520} height={520} viewBox="0 0 520 520">
          {arcs.map((d, i) => (
            <path key={i} d={d} stroke={sliceColor(theme, palette, slices, i)} strokeWidth={theme.visualLanguage === 'minimal' ? 38 : 52} fill="none" strokeLinecap={theme.visualLanguage === 'infographic' ? 'butt' : 'round'} />
          ))}
        </svg>
        <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm}}>
          {slices.map((slice, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: theme.spacing.sm, fontSize: theme.typography.subheading, color: theme.colors.text, fontFamily: theme.fonts.body}}>
              <div style={{width: 18, height: theme.visualLanguage === 'infographic' ? 18 : 18, borderRadius: theme.visualLanguage === 'infographic' ? 0 : 4, background: slice.color ?? sliceColor(theme, palette, slices, i)}} />
              {slice.label} <span style={{color: theme.colors.muted}}>{Math.round((slice.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </SafeArea>
  );
}

function sliceColor(theme: Theme, palette: string[], slices: Array<{color?: string}>, i: number): string {
  return slices[i]?.color ?? palette[i % palette.length]!;
}

export const DataTableProps = z.object({
  title: z.string().default('Table'),
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).min(1),
});

export function DataTable({data, theme}: VisualComponentProps<z.infer<typeof DataTableProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0, type: theme.motion.reveal});
  const rows = data.rows.slice(0, 6);
  const radius = theme.radius.sm;
  return (
    <SafeArea theme={theme}>
      <div style={{opacity: r.opacity}}>
        {titleBlock(theme, data.title)}
        <table style={{marginTop: theme.spacing.lg, width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px'}}>
          <thead>
            <tr>
              {data.headers.map((header, i) => (
                <th key={i} style={{fontSize: theme.typography.caption, color: theme.colors.primary, textAlign: 'left', padding: theme.spacing.sm, borderBottom: `${theme.borders.width * 2}px solid ${theme.colors.primary}`, fontFamily: theme.fonts.heading}}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const s = useSequencedReveal(ri, 8, theme.motion.spring);
              return (
                <tr key={ri} style={{opacity: s.opacity}}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{fontSize: theme.typography.subheading, color: ci === 0 ? theme.colors.text : theme.colors.muted, padding: theme.spacing.sm, background: theme.colors.surface, border: `1px solid ${theme.surfaces.borderColor}`, fontFamily: theme.fonts.body, borderRadius: ci === 0 ? `${radius}px 0 0 ${radius}px` : ci === row.length - 1 ? `0 ${radius}px ${radius}px 0` : 0}}>
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SafeArea>
  );
}

export const NumberCounterProps = z.object({
  title: z.string().default(''),
  value: z.number(),
  unit: z.string().default(''),
  caption: z.string().default(''),
});

export function NumberCounter({data, theme}: VisualComponentProps<z.infer<typeof NumberCounterProps>>) {
  const frame = useCurrentFrame();
  const progress = useEasing(0, 40);
  const shown = Math.round(data.value * progress);
  const digits = String(shown).padStart(String(Math.abs(data.value)).length, '0');
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  const draw = useDrawProgress(14, 30);
  return (
    <SafeArea theme={theme} center>
      <div style={{textAlign: 'center', position: 'relative'}}>
        {data.title ? <div style={{fontSize: theme.typography.subheading, color: theme.colors.muted, fontFamily: theme.fonts.body}}>{data.title}</div> : null}
        <div style={{fontFamily: theme.fonts.mono, fontSize: handDrawn ? 110 : 150, fontWeight: 800, color: theme.colors.accent, letterSpacing: 2, marginTop: theme.spacing.sm}}>
          {digits}
          {data.unit}
        </div>
        {handDrawn ? (
          <div style={{display: 'flex', justifyContent: 'center', marginTop: -6}}>
            <HandUnderline theme={theme} width={Math.min(420, digits.length * 60)} color={theme.colors.primary} progress={draw} />
          </div>
        ) : null}
        {theme.visualLanguage === 'infographic' ? (
          <div style={{width: 120, height: 12, background: theme.colors.accent, margin: `${theme.spacing.sm}px auto 0`}} />
        ) : null}
        {data.caption ? <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, marginTop: theme.spacing.md, fontFamily: theme.fonts.body}}>{data.caption}</div> : null}
      </div>
    </SafeArea>
  );
}

export const FormulaProps = z.object({
  title: z.string().default('Formula'),
  formula: z.string().min(1),
  description: z.string().default(''),
});

export function Formula({data, theme}: VisualComponentProps<z.infer<typeof FormulaProps>>) {
  const r = useReveal({startFrame: 0, type: theme.visualLanguage === 'infographic' ? 'scale' : 'scale'});
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  const draw = useDrawProgress(10, 32);
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, transform: `scale(${r.scale})`, textAlign: 'center'}}>
        <Kicker text={data.title} theme={theme} />
        <div
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 84,
            fontWeight: 700,
            color: theme.colors.accent,
            background: theme.colors.surface,
            borderRadius: handDrawn ? 8 : theme.radius.md,
            border: handDrawn ? `2px dashed ${theme.colors.muted}` : `1px solid ${theme.surfaces.borderColor}`,
            boxShadow: handDrawn ? 'none' : theme.shadows.md,
            padding: `${theme.spacing.xl}px ${theme.spacing.xl * 2}px`,
            marginTop: theme.spacing.lg,
            display: 'inline-block',
            position: 'relative',
          }}
        >
          {handDrawn ? <MarkerHighlight theme={theme} width={data.formula.length * 24} height={28} opacity={0.35} progress={draw} style={{top: -10, left: 0}} /> : null}
          {data.formula}
        </div>
        {data.description ? (
          <div style={{fontSize: theme.typography.subheading, color: theme.colors.muted, marginTop: theme.spacing.lg, fontFamily: theme.fonts.body}}>{data.description}</div>
        ) : null}
      </div>
    </SafeArea>
  );
}

export const FormulaDerivationProps = z.object({
  title: z.string().default('Derivation'),
  steps: z.array(z.string()).min(1),
  conclusion: z.string().min(1),
});

export function FormulaDerivation({data, theme}: VisualComponentProps<z.infer<typeof FormulaDerivationProps>>) {
  const frame = useCurrentFrame();
  const steps = data.steps.slice(0, 4);
  return (
    <SafeArea theme={theme}>
      <Kicker text={data.title} theme={theme} />
      <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.lg}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 10, theme.motion.spring);
          return (
            <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, fontFamily: theme.fonts.mono, fontSize: 40, color: theme.colors.text, background: theme.colors.surface, border: `1px solid ${theme.surfaces.borderColor}`, borderRadius: theme.radius.sm, padding: `${theme.spacing.md}px ${theme.spacing.lg}px`}}>
              {step}
            </div>
          );
        })}
        <div style={{fontFamily: theme.fonts.mono, fontSize: 44, fontWeight: 700, color: theme.colors.accent, marginTop: theme.spacing.sm}}>
          ⇒ {data.conclusion}
        </div>
      </div>
    </SafeArea>
  );
}

export const EquationHighlightProps = z.object({
  equation: z.string().min(1),
  highlights: z.array(z.string()).default([]),
  caption: z.string().default(''),
});

export function EquationHighlight({data, theme}: VisualComponentProps<z.infer<typeof EquationHighlightProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0, type: 'scale'});
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, transform: `scale(${r.scale})`, textAlign: 'center'}}>
        <div style={{fontFamily: theme.fonts.mono, fontSize: 76, fontWeight: 700, color: theme.colors.text}}>{data.equation}</div>
        {data.highlights.map((h, i) => {
          const s = useSequencedReveal(i, 8, theme.motion.spring);
          return (
            <div key={i} style={{opacity: s.opacity, display: 'inline-block', margin: theme.spacing.sm, fontSize: theme.typography.subheading, color: theme.colors.accent, borderBottom: `${theme.borders.width * 2}px solid ${theme.colors.accent}`, paddingBottom: 4, fontFamily: theme.fonts.body}}>
              {h}
            </div>
          );
        })}
        {data.caption ? <div style={{fontSize: theme.typography.subheading, color: theme.colors.muted, marginTop: theme.spacing.md, fontFamily: theme.fonts.body}}>{data.caption}</div> : null}
      </div>
    </SafeArea>
  );
}

export const StepByStepCalculationProps = z.object({
  title: z.string().default('Step-by-step'),
  steps: z.array(z.object({expression: z.string(), result: z.string()})).min(1),
  conclusion: z.string().default(''),
});

export function StepByStepCalculation({data, theme}: VisualComponentProps<z.infer<typeof StepByStepCalculationProps>>) {
  const frame = useCurrentFrame();
  const steps = data.steps.slice(0, 6);
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  return (
    <SafeArea theme={theme}>
      <Kicker text={data.title} theme={theme} />
      <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.lg}}>
        {steps.map((step, i) => {
          const s = useSequencedReveal(i, 9, theme.motion.spring);
          return (
            <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, display: 'flex', alignItems: 'center', gap: theme.spacing.md}}>
              {handDrawn ? (
                <div style={{width: 44, height: 44, position: 'relative'}}>
                  <SketchCircle theme={theme} seed={i * 3 + 20} size={44} color={theme.colors.primary} startFrame={4 + i * 4} durationFrames={20} />
                  <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: theme.colors.primary, fontFamily: theme.fonts.heading}}>
                    {i + 1}
                  </div>
                </div>
              ) : (
                <div style={{width: 40, height: 40, borderRadius: theme.visualLanguage === 'infographic' ? 0 : 20, background: theme.colors.primary, color: theme.colors.onAccent, fontWeight: 800, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fonts.heading}}>
                  {i + 1}
                </div>
              )}
              <div style={{fontFamily: theme.fonts.mono, fontSize: 34, color: theme.colors.text}}>{step.expression}</div>
              <div style={{fontFamily: theme.fonts.mono, fontSize: 34, color: theme.colors.accent, marginLeft: 'auto'}}>{step.result}</div>
            </div>
          );
        })}
        {data.conclusion ? (
          <div style={{marginTop: theme.spacing.md, fontSize: theme.typography.subheading, fontWeight: 700, color: theme.colors.accent, fontFamily: theme.fonts.heading}}>
            {data.conclusion}
          </div>
        ) : null}
      </div>
    </SafeArea>
  );
}
