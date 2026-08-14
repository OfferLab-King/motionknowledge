import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import type {Theme} from '../theme';
import {SafeArea, Kicker, TruncatedText} from '../layout';
import {useReveal, useSequencedReveal} from '../motion';
import {HandUnderline, MarkerHighlight, SketchCircle, useDrawProgress} from './variants';

export const TitleHeroProps = z.object({
  title: z.string().min(1),
  subtitle: z.string().default(''),
  kicker: z.string().default('MotionKnowledge'),
});

export function TitleHero({data, theme}: VisualComponentProps<z.infer<typeof TitleHeroProps>>) {
  const frame = useCurrentFrame();
  const reveal = useReveal({startFrame: 0, type: theme.motion.reveal});
  const subtitle = useReveal({startFrame: 16});
  const accent = interpolate(frame, [20, 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  const underline = useDrawProgress(24, 26);
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: reveal.opacity, transform: `translateY(${reveal.translateY}px)`, maxWidth: 1400, textAlign: 'center'}}>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Kicker text={data.kicker} theme={theme} />
        </div>
        <div
          style={{
            fontFamily: theme.fonts.heading,
            fontWeight: 800,
            fontSize: theme.typography.display,
            lineHeight: 1.08,
            color: theme.colors.text,
            marginTop: theme.spacing.md,
          }}
        >
          {data.title}
        </div>
        {handDrawn ? (
          <div style={{display: 'flex', justifyContent: 'center', marginTop: 6}}>
            <HandUnderline theme={theme} width={Math.min(560, data.title.length * 28)} color={theme.colors.accent} progress={underline} />
          </div>
        ) : (
          <div
            style={{
              width: 160,
              height: theme.visualLanguage === 'infographic' ? 10 : 6,
              borderRadius: theme.visualLanguage === 'infographic' ? 0 : 3,
              background: theme.colors.primary,
              margin: `${theme.spacing.lg}px auto`,
              transform: `scaleX(${accent})`,
            }}
          />
        )}
        {data.subtitle ? (
          <div style={{opacity: subtitle.opacity, fontSize: theme.typography.subheading, color: theme.colors.muted, maxWidth: 1000, margin: '0 auto', fontFamily: theme.fonts.body}}>
            {data.subtitle}
          </div>
        ) : null}
      </div>
    </SafeArea>
  );
}

export const SectionIntroProps = z.object({
  title: z.string().min(1),
  kicker: z.string().default('Next'),
  bullets: z.array(z.string()).default([]),
});

export function SectionIntro({data, theme}: VisualComponentProps<z.infer<typeof SectionIntroProps>>) {
  const r = useReveal({startFrame: 0, type: theme.motion.reveal});
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, transform: `translateY(${r.translateY}px)`, maxWidth: 1400}}>
        <Kicker text={data.kicker} theme={theme} />
        <div style={{fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: theme.typography.heading, color: theme.colors.text, marginTop: theme.spacing.sm}}>
          {data.title}
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.lg}}>
          {data.bullets.slice(0, 4).map((bullet, i) => {
            const s = useSequencedReveal(i, 10, theme.motion.spring);
            return (
              <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, fontSize: theme.typography.subheading, color: theme.colors.text, fontFamily: theme.fonts.body}}>
                <span style={{color: theme.colors.primary}}>{theme.visualLanguage === 'hand-drawn' ? '› ' : '▸ '}</span>
                {bullet}
              </div>
            );
          })}
        </div>
      </div>
    </SafeArea>
  );
}

export const QuoteProps = z.object({
  text: z.string().min(1),
  attribution: z.string().default(''),
});

export function Quote({data, theme}: VisualComponentProps<z.infer<typeof QuoteProps>>) {
  const r = useReveal({startFrame: 0, type: theme.motion.reveal});
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, maxWidth: 1400, textAlign: 'center', position: 'relative'}}>
        {handDrawn ? (
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: theme.spacing.md}}>
            <SketchCircle theme={theme} seed={11} size={64} color={theme.colors.accent} strokeWidth={2} />
          </div>
        ) : null}
        <div style={{fontFamily: theme.fonts.heading, fontWeight: 700, fontSize: theme.typography.heading, lineHeight: 1.25, color: theme.colors.text}}>
          “{data.text}”
        </div>
        {handDrawn ? (
          <div style={{display: 'flex', justifyContent: 'center', marginTop: theme.spacing.sm}}>
            <HandUnderline theme={theme} width={Math.min(300, data.text.length * 8)} color={theme.colors.primary} startFrame={30} durationFrames={20} />
          </div>
        ) : null}
        {data.attribution ? (
          <div style={{marginTop: theme.spacing.lg, fontSize: theme.typography.subheading, color: theme.colors.accent, fontFamily: theme.fonts.body}}>— {data.attribution}</div>
        ) : null}
      </div>
    </SafeArea>
  );
}

export const KeyTakeawayProps = z.object({
  title: z.string().default('Key takeaway'),
  text: z.string().min(1),
});

export function KeyTakeaway({data, theme}: VisualComponentProps<z.infer<typeof KeyTakeawayProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0, type: 'scale'});
  const border = interpolate(frame, [18, 48], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  const draw = useDrawProgress(14, 30);
  return (
    <SafeArea theme={theme} center>
      <div
        style={{
          opacity: r.opacity,
          borderLeft: handDrawn ? 'none' : `8px solid ${theme.colors.accent}`,
          borderColor: theme.colors.accent,
          borderImage: handDrawn ? undefined : `linear-gradient(${theme.colors.accent} ${border * 100}%, transparent 0) 1`,
          background: theme.colors.surface,
          borderRadius: theme.radius.md,
          boxShadow: handDrawn ? '2px 3px 0 rgba(46,42,36,0.12)' : theme.shadows.md,
          padding: `${theme.spacing.xl}px`,
          maxWidth: 1500,
          position: 'relative',
          transform: `scale(${r.scale})${handDrawn ? ' rotate(-0.5deg)' : ''}`,
        }}
      >
        {handDrawn ? (
          <div style={{position: 'absolute', top: -12, left: 28}}>
            <MarkerHighlight theme={theme} width={Math.max(140, data.title.length * 18)} height={22} opacity={0.5} progress={draw} />
          </div>
        ) : null}
        <Kicker text={data.title} theme={theme} />
        <div style={{marginTop: theme.spacing.sm, fontSize: theme.typography.subheading, color: theme.colors.text, fontFamily: theme.fonts.heading, fontWeight: 700}}>
          {data.text}
        </div>
        {handDrawn ? <HandUnderline theme={theme} width={Math.min(500, data.text.length * 10)} color={theme.colors.accent} startFrame={36} durationFrames={24} style={{marginTop: 10}} /> : null}
      </div>
    </SafeArea>
  );
}

export const SummaryProps = z.object({
  title: z.string().default('Summary'),
  points: z.array(z.string()).min(1),
});

export function Summary({data, theme}: VisualComponentProps<z.infer<typeof SummaryProps>>) {
  const r = useReveal({startFrame: 0, type: theme.motion.reveal});
  return (
    <SafeArea theme={theme}>
      <div style={{opacity: r.opacity, transform: `translateY(${r.translateY}px)`}}>
        <Kicker text={data.title} theme={theme} />
        <div style={{fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: theme.typography.heading, color: theme.colors.text, marginTop: theme.spacing.sm}}>
          What we covered
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.md, marginTop: theme.spacing.lg}}>
          {data.points.slice(0, 6).map((point, i) => {
            const s = useSequencedReveal(i, 10, theme.motion.spring);
            return (
              <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, background: theme.colors.surface, borderRadius: theme.radius.sm, border: `1px solid ${theme.surfaces.borderColor}`, padding: theme.spacing.md, fontSize: theme.typography.subheading, color: theme.colors.text, display: 'flex', gap: theme.spacing.sm, fontFamily: theme.fonts.body}}>
                <span style={{color: theme.colors.primary, fontWeight: 700}}>{i + 1}.</span>
                {point}
              </div>
            );
          })}
        </div>
      </div>
    </SafeArea>
  );
}

export const OutroProps = z.object({
  title: z.string().default('Thanks for watching'),
  tagline: z.string().default('Continue your learning journey'),
});

export function Outro({data, theme}: VisualComponentProps<z.infer<typeof OutroProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0, type: theme.motion.reveal});
  const ring = interpolate(frame, [20, 90], [0.6, 1.6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ringOpacity = interpolate(frame, [20, 60, 90], [0.8, 0.2, 0]);
  return (
    <SafeArea theme={theme} center>
      <div style={{position: 'relative', width: 220, height: 220, opacity: r.opacity}}>
        {theme.visualLanguage === 'hand-drawn' ? (
          <div style={{position: 'absolute', inset: 10}}>
            <SketchCircle theme={theme} seed={42} size={200} color={theme.colors.primary} startFrame={12} durationFrames={40} />
          </div>
        ) : (
          <div style={{position: 'absolute', inset: 0, borderRadius: 999, border: `3px solid ${theme.colors.primary}`, transform: `scale(${ring})`, opacity: ringOpacity}} />
        )}
        <div style={{position: 'absolute', inset: 0, borderRadius: theme.visualLanguage === 'hand-drawn' ? 999 : 999, background: theme.colors.surface, border: `1px solid ${theme.surfaces.borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72}}>
          {theme.visualLanguage === 'hand-drawn' ? '✓' : '🎓'}
        </div>
      </div>
      <div style={{opacity: r.opacity, marginTop: theme.spacing.lg, textAlign: 'center'}}>
        <div style={{fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: theme.typography.heading, color: theme.colors.text}}>{data.title}</div>
        <div style={{fontSize: theme.typography.subheading, color: theme.colors.muted, marginTop: theme.spacing.sm, fontFamily: theme.fonts.body}}>{data.tagline}</div>
      </div>
    </SafeArea>
  );
}
