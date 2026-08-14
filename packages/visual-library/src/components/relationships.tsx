import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import type {Theme} from '../theme';
import {SafeArea, Kicker, Panel, TruncatedText} from '../layout';
import {useReveal, useSequencedReveal, useEasing} from '../motion';
import {SketchCircle} from './variants';

export const RelationshipDiagramProps = z.object({
  title: z.string().default('Relationship'),
  subject: z.string().min(1),
  related: z.array(z.object({label: z.string(), relation: z.string()})).min(1),
});

export function RelationshipDiagram({data, theme}: VisualComponentProps<z.infer<typeof RelationshipDiagramProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0, type: 'scale'});
  const rels = data.related.slice(0, 6);
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, transform: `scale(${r.scale})`, textAlign: 'center'}}>
        <Kicker text={data.title} theme={theme} />
        <div style={{display: 'flex', alignItems: 'center', gap: theme.spacing.xl, marginTop: theme.spacing.xl}}>
          <div style={{width: 230, height: 230, borderRadius: handDrawn ? 999 : theme.radius.lg, background: theme.colors.primary, color: theme.colors.onAccent, fontWeight: 800, fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: theme.spacing.md, fontFamily: theme.fonts.heading}}>
            {data.subject}
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.md}}>
            {rels.map((item, i) => {
              const s = useSequencedReveal(i, 7, theme.motion.spring);
              return (
                <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, display: 'flex', alignItems: 'center', gap: theme.spacing.md}}>
                  <div style={{fontSize: theme.typography.caption, color: theme.colors.accent, fontStyle: 'italic', minWidth: 160, textAlign: 'right', fontFamily: theme.fonts.body}}>{item.relation}</div>
                  <div style={{width: 60, height: 3, background: theme.colors.primary}} />
                  <div style={{background: theme.colors.surface, border: `1px solid ${theme.surfaces.borderColor}`, borderRadius: theme.radius.sm, padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, fontSize: theme.typography.caption, color: theme.colors.text, fontFamily: theme.fonts.body}}>
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SafeArea>
  );
}

export const NetworkDiagramProps = z.object({
  title: z.string().default('Network'),
  nodes: z.array(z.object({label: z.string(), group: z.number().int().default(0)})).min(2),
});

export function NetworkDiagram({data, theme}: VisualComponentProps<z.infer<typeof NetworkDiagramProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0});
  const nodes = data.nodes.slice(0, 8);
  const palette = theme.colors.chartPalette;
  const positions = nodes.map((_, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const radius = 260;
    return {x: 420 + radius * Math.cos(angle), y: 300 + radius * Math.sin(angle) * 0.7};
  });
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity}}>
        <Kicker text={data.title} theme={theme} />
        <svg width={840} height={600} viewBox="0 0 840 600" style={{marginTop: theme.spacing.md}}>
          {positions.slice(1).map((pos, i) => (
            <line key={i} x1={positions[0]!.x} y1={positions[0]!.y} x2={pos.x} y2={pos.y} stroke={theme.colors.surfaceAlt} strokeWidth={3} strokeDasharray={handDrawn ? '8 6' : undefined} />
          ))}
          {positions.map((pos, i) => {
            const s = useSequencedReveal(i, 5, theme.motion.spring);
            const color = palette[nodes[i]!.group % palette.length] ?? theme.colors.primary;
            return (
              <g key={i} opacity={s.opacity}>
                <circle cx={pos.x} cy={pos.y} r={46} fill={color} opacity={0.15} />
                <circle cx={pos.x} cy={pos.y} r={30} fill={color} />
                <text x={pos.x} y={pos.y + 8} textAnchor="middle" fill={theme.colors.onAccent} fontSize={20} fontWeight={700}>
                  {nodes[i]!.label.slice(0, 12)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </SafeArea>
  );
}

export const MatrixProps = z.object({
  title: z.string().default('Matrix'),
  quadrants: z.array(z.object({label: z.string(), description: z.string()})).length(4),
});

export function Matrix({data, theme}: VisualComponentProps<z.infer<typeof MatrixProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0});
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity}}>
        <Kicker text={data.title} theme={theme} />
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.lg, marginTop: theme.spacing.lg}}>
          {data.quadrants.map((quadrant, i) => {
            const s = useSequencedReveal(i, 8, theme.motion.spring);
            return (
              <Panel key={i} theme={theme} seed={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, width: 460, height: 220, justifyContent: 'center', borderTop: `${theme.borders.width * 2}px solid ${i % 2 === 0 ? theme.colors.primary : theme.colors.accent}`}}>
                <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, fontWeight: 700, fontFamily: theme.fonts.heading}}>{quadrant.label}</div>
                <div style={{fontSize: theme.typography.caption, color: theme.colors.muted, marginTop: 6, fontFamily: theme.fonts.body}}>{quadrant.description}</div>
              </Panel>
            );
          })}
        </div>
      </div>
    </SafeArea>
  );
}

export const PyramidProps = z.object({
  title: z.string().default('Pyramid'),
  layers: z.array(z.object({label: z.string(), caption: z.string()})).min(2),
});

export function Pyramid({data, theme}: VisualComponentProps<z.infer<typeof PyramidProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0});
  const layers = data.layers.slice(0, 6);
  const palette = theme.colors.chartPalette;
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity}}>
        <Kicker text={data.title} theme={theme} />
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: theme.spacing.lg}}>
          {layers.map((layer, i) => {
            const s = useSequencedReveal(i, 8, theme.motion.spring);
            const width = 1200 - i * 170;
            const color = palette[i % palette.length]!;
            return (
              <div key={i} style={{opacity: s.opacity * (0.92 - i * 0.06), width, minHeight: 110, background: color, borderRadius: i === 0 ? `${theme.radius.md}px ${theme.radius.md}px 0 0` : 0, borderTop: `3px solid ${theme.colors.background}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.colors.onAccent, fontFamily: theme.fonts.heading}}>
                <div style={{fontWeight: 800, fontSize: theme.typography.subheading}}>{layer.label}</div>
                {layer.caption ? <div style={{fontSize: theme.typography.caption, opacity: 0.8, fontFamily: theme.fonts.body}}>{layer.caption}</div> : null}
              </div>
            );
          })}
        </div>
      </div>
    </SafeArea>
  );
}

export const FunnelProps = z.object({
  title: z.string().default('Funnel'),
  stages: z.array(z.object({label: z.string(), value: z.string()})).min(2),
});

export function Funnel({data, theme}: VisualComponentProps<z.infer<typeof FunnelProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0});
  const stages = data.stages.slice(0, 6);
  const palette = theme.colors.chartPalette;
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity}}>
        <Kicker text={data.title} theme={theme} />
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: theme.spacing.lg, gap: 2}}>
          {stages.map((stage, i) => {
            const s = useSequencedReveal(i, 7, theme.motion.spring);
            const width = 1240 - i * 160;
            const color = palette[i % palette.length]!;
            return (
              <div key={i} style={{opacity: s.opacity, width, height: 96, background: color, clipPath: 'polygon(2% 0, 98% 0, 92% 100%, 8% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px', fontFamily: theme.fonts.heading}}>
                <div style={{fontSize: theme.typography.subheading, fontWeight: 700, color: theme.colors.onAccent}}>{stage.label}</div>
                <div style={{fontSize: theme.typography.subheading, fontWeight: 800, color: theme.colors.onAccent}}>{stage.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </SafeArea>
  );
}
