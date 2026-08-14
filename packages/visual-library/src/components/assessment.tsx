import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import type {Theme} from '../theme';
import {SafeArea, Kicker, Panel} from '../layout';
import {useReveal, useSequencedReveal} from '../motion';

export const QuizQuestionProps = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
});

export function QuizQuestion({data, theme}: VisualComponentProps<z.infer<typeof QuizQuestionProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0, type: theme.motion.reveal});
  const options = data.options.slice(0, 4);
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, transform: `translateY(${r.translateY}px)`, maxWidth: 1500, width: '100%'}}>
        <Kicker text="Check your understanding" theme={theme} />
        <div style={{fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: theme.typography.heading, color: theme.colors.text, marginTop: theme.spacing.sm}}>
          {data.question}
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginTop: theme.spacing.xl}}>
          {options.map((option, i) => {
            const s = useSequencedReveal(i, 10, theme.motion.spring);
            return (
              <Panel key={i} theme={theme} seed={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md}}>
                <div style={{width: 44, height: 44, borderRadius: theme.visualLanguage === 'infographic' ? 0 : 22, border: `${theme.borders.width * 2}px solid ${theme.colors.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: theme.colors.primary, fontWeight: 700, fontFamily: theme.fonts.heading}}>
                  {String.fromCharCode(65 + i)}
                </div>
                <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, fontFamily: theme.fonts.body}}>{option}</div>
              </Panel>
            );
          })}
        </div>
      </div>
    </SafeArea>
  );
}

export const QuizAnswerProps = z.object({
  question: z.string().min(1),
  correct: z.string().min(1),
  explanation: z.string().default(''),
});

export function QuizAnswer({data, theme}: VisualComponentProps<z.infer<typeof QuizAnswerProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0, type: 'scale'});
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, transform: `scale(${r.scale})`, maxWidth: 1400, width: '100%'}}>
        <Panel theme={theme} style={{borderTop: `${theme.borders.width * 2}px solid ${theme.colors.success}`, gap: theme.spacing.sm}}>
          <div style={{fontSize: theme.typography.subheading, color: theme.colors.muted, fontFamily: theme.fonts.body}}>{data.question}</div>
          <div style={{display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.sm}}>
            <div style={{width: 64, height: 64, borderRadius: theme.visualLanguage === 'infographic' ? 0 : 32, background: theme.colors.success, color: theme.colors.onSurface, fontSize: 34, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              ✓
            </div>
            <div style={{fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: theme.typography.heading, color: theme.colors.success}}>{data.correct}</div>
          </div>
          {data.explanation ? (
            <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, marginTop: theme.spacing.sm, fontFamily: theme.fonts.body}}>{data.explanation}</div>
          ) : null}
        </Panel>
      </div>
    </SafeArea>
  );
}
