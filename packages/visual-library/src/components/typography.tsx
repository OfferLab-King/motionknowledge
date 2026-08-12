import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import {fonts, type Theme} from '../theme';
import {SafeArea, Kicker, TruncatedText} from '../layout';
import {useReveal, useSequencedReveal} from '../motion';

export const TitleHeroProps = z.object({
  title: z.string().min(1),
  subtitle: z.string().default(''),
  kicker: z.string().default('MotionKnowledge'),
});

export function TitleHero({data, theme}: VisualComponentProps<z.infer<typeof TitleHeroProps>>) {
  const frame = useCurrentFrame();
  const reveal = useReveal({startFrame: 0, type: 'slide-up'});
  const subtitle = useReveal({startFrame: 16});
  const accent = interpolate(frame, [20, 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: reveal.opacity, transform: `translateY(${reveal.translateY}px)`, maxWidth: 1400, textAlign: 'center'}}>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Kicker text={data.kicker} theme={theme} />
        </div>
        <div
          style={{
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: 92,
            lineHeight: 1.08,
            color: theme.colors.text,
            marginTop: theme.spacing.md,
          }}
        >
          {data.title}
        </div>
        <div
          style={{
            width: 160,
            height: 6,
            borderRadius: 3,
            background: theme.colors.primary,
            margin: `${theme.spacing.lg}px auto`,
            transform: `scaleX(${accent})`,
          }}
        />
        {data.subtitle ? (
          <div style={{opacity: subtitle.opacity, fontSize: 34, color: theme.colors.muted, maxWidth: 1000, margin: '0 auto'}}>
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
  const r = useReveal({startFrame: 0, type: 'slide-up'});
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, transform: `translateY(${r.translateY}px)`, maxWidth: 1400}}>
        <Kicker text={data.kicker} theme={theme} />
        <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 76, color: theme.colors.text, marginTop: theme.spacing.sm}}>
          {data.title}
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.lg}}>
          {data.bullets.slice(0, 4).map((bullet, i) => {
            const s = useSequencedReveal(i);
            return (
              <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, fontSize: 30, color: theme.colors.text}}>
                <span style={{color: theme.colors.primary}}>▸ </span>
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
  const r = useReveal({startFrame: 0});
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, maxWidth: 1400, textAlign: 'center'}}>
        <div style={{fontFamily: fonts.heading, fontWeight: 700, fontSize: 64, lineHeight: 1.25, color: theme.colors.text}}>
          “{data.text}”
        </div>
        {data.attribution ? (
          <div style={{marginTop: theme.spacing.lg, fontSize: 30, color: theme.colors.accent}}>— {data.attribution}</div>
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
  return (
    <SafeArea theme={theme} center>
      <div
        style={{
          opacity: r.opacity,
          transform: `scale(${r.scale})`,
          borderLeft: `8px solid ${theme.colors.accent}`,
          borderColor: theme.colors.accent,
          borderImage: `linear-gradient(${theme.colors.accent} ${border * 100}%, transparent 0) 1`,
          background: theme.colors.surface,
          borderRadius: theme.radius.md,
          padding: `${theme.spacing.xl}px`,
          maxWidth: 1500,
        }}
      >
        <Kicker text={data.title} theme={theme} />
        <div style={{marginTop: theme.spacing.sm, fontSize: 40, color: theme.colors.text, fontFamily: fonts.heading, fontWeight: 700}}>
          {data.text}
        </div>
      </div>
    </SafeArea>
  );
}

export const SummaryProps = z.object({
  title: z.string().default('Summary'),
  points: z.array(z.string()).min(1),
});

export function Summary({data, theme}: VisualComponentProps<z.infer<typeof SummaryProps>>) {
  const r = useReveal({startFrame: 0, type: 'slide-up'});
  return (
    <SafeArea theme={theme}>
      <div style={{opacity: r.opacity, transform: `translateY(${r.translateY}px)`}}>
        <Kicker text={data.title} theme={theme} />
        <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 64, color: theme.colors.text, marginTop: theme.spacing.sm}}>
          What we covered
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.md, marginTop: theme.spacing.lg}}>
          {data.points.slice(0, 6).map((point, i) => {
            const s = useSequencedReveal(i);
            return (
              <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, background: theme.colors.surface, borderRadius: theme.radius.sm, padding: theme.spacing.md, fontSize: 28, color: theme.colors.text, display: 'flex', gap: theme.spacing.sm}}>
                <span style={{color: theme.colors.primary}}>{i + 1}.</span>
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
  const r = useReveal({startFrame: 0, type: 'slide-up'});
  const ring = interpolate(frame, [20, 90], [0.6, 1.6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ringOpacity = interpolate(frame, [20, 60, 90], [0.8, 0.2, 0]);
  return (
    <SafeArea theme={theme} center>
      <div style={{position: 'relative', width: 220, height: 220, opacity: r.opacity}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 999, border: `3px solid ${theme.colors.primary}`, transform: `scale(${ring})`, opacity: ringOpacity}} />
        <div style={{position: 'absolute', inset: 0, borderRadius: 999, background: theme.colors.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72}}>
          🎓
        </div>
      </div>
      <div style={{opacity: r.opacity, marginTop: theme.spacing.lg, textAlign: 'center'}}>
        <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 72, color: theme.colors.text}}>{data.title}</div>
        <div style={{fontSize: 32, color: theme.colors.muted, marginTop: theme.spacing.sm}}>{data.tagline}</div>
      </div>
    </SafeArea>
  );
}
