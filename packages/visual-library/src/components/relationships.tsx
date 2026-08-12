import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import {fonts, type Theme} from '../theme';
import {SafeArea, Kicker, Panel, TruncatedText} from '../layout';
import {useReveal, useSequencedReveal, useEasing} from '../motion';

export const RelationshipDiagramProps = z.object({
  title: z.string().default('Relationship'),
  subject: z.string().min(1),
  related: z.array(z.object({label: z.string(), relation: z.string()})).min(1),
});

export function RelationshipDiagram({data, theme}: VisualComponentProps<z.infer<typeof RelationshipDiagramProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0, type: 'scale'});
  const rels = data.related.slice(0, 6);
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, transform: `scale(${r.scale})`, textAlign: 'center'}}>
        <Kicker text={data.title} theme={theme} />
        <div style={{display: 'flex', alignItems: 'center', gap: theme.spacing.xl, marginTop: theme.spacing.xl}}>
          <div style={{width: 230, height: 230, borderRadius: 115, background: theme.colors.primary, color: '#08111F', fontWeight: 800, fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: theme.spacing.md}}>
            {data.subject}
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.md}}>
            {rels.map((item, i) => {
              const s = useSequencedReveal(i, 7);
              return (
                <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, display: 'flex', alignItems: 'center', gap: theme.spacing.md}}>
                  <div style={{fontSize: 24, color: theme.colors.accent, fontStyle: 'italic', minWidth: 160, textAlign: 'right'}}>{item.relation}</div>
                  <div style={{width: 60, height: 3, background: theme.colors.primary}} />
                  <div style={{background: theme.colors.surface, borderRadius: theme.radius.sm, padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, fontSize: 26, color: theme.colors.text}}>
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
  const palette = [theme.colors.primary, theme.colors.accent, '#8B5CF6', '#4ADE80'];
  const positions = nodes.map((_, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const radius = 260;
    return {x: 420 + radius * Math.cos(angle), y: 300 + radius * Math.sin(angle) * 0.7};
  });
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity}}>
        <Kicker text={data.title} theme={theme} />
        <svg width={840} height={600} viewBox="0 0 840 600" style={{marginTop: theme.spacing.md}}>
          {positions.slice(1).map((pos, i) => (
            <line key={i} x1={positions[0]!.x} y1={positions[0]!.y} x2={pos.x} y2={pos.y} stroke={theme.colors.surface} strokeWidth={3} />
          ))}
          {positions.map((pos, i) => {
            const s = useSequencedReveal(i, 5);
            const color = palette[nodes[i]!.group % palette.length] ?? theme.colors.primary;
            return (
              <g key={i} opacity={s.opacity}>
                <circle cx={pos.x} cy={pos.y} r={46} fill={color} opacity={0.15} />
                <circle cx={pos.x} cy={pos.y} r={30} fill={color} />
                <text x={pos.x} y={pos.y + 8} textAnchor="middle" fill="#08111F" fontSize={20} fontWeight={700}>
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
            const s = useSequencedReveal(i, 8);
            return (
              <Panel key={i} theme={theme} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, width: 460, height: 220, justifyContent: 'center', borderTop: `6px solid ${i % 2 === 0 ? theme.colors.primary : theme.colors.accent}`}}>
                <div style={{fontSize: 32, color: theme.colors.text, fontWeight: 700, fontFamily: fonts.heading}}>{quadrant.label}</div>
                <div style={{fontSize: 26, color: theme.colors.muted, marginTop: 6}}>{quadrant.description}</div>
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
  const palette = [theme.colors.accent, theme.colors.primary, '#8B5CF6', '#4ADE80', '#FB923C', '#38BDF8'];
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity}}>
        <Kicker text={data.title} theme={theme} />
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: theme.spacing.lg}}>
          {layers.map((layer, i) => {
            const s = useSequencedReveal(i, 8);
            const width = 1200 - i * 170;
            return (
              <div key={i} style={{opacity: s.opacity * (0.92 - i * 0.06), width, minHeight: 110, background: palette[i % palette.length], borderRadius: i === 0 ? '18px 18px 0 0' : 0, borderTop: `3px solid ${theme.colors.background}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#08111F'}}>
                <div style={{fontWeight: 800, fontSize: 30}}>{layer.label}</div>
                {layer.caption ? <div style={{fontSize: 20, opacity: 0.8}}>{layer.caption}</div> : null}
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
  const palette = [theme.colors.primary, '#38BDF8', '#8B5CF6', '#F472B6', theme.colors.accent, '#4ADE80'];
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity}}>
        <Kicker text={data.title} theme={theme} />
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: theme.spacing.lg, gap: 2}}>
          {stages.map((stage, i) => {
            const s = useSequencedReveal(i, 7);
            const width = 1240 - i * 160;
            return (
              <div key={i} style={{opacity: s.opacity, width, height: 96, background: palette[i % palette.length], clipPath: 'polygon(2% 0, 98% 0, 92% 100%, 8% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px'}}>
                <div style={{fontSize: 28, fontWeight: 700, color: '#08111F'}}>{stage.label}</div>
                <div style={{fontSize: 28, fontWeight: 800, color: '#08111F'}}>{stage.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </SafeArea>
  );
}
