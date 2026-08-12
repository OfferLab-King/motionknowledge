import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import {fonts, type Theme} from '../theme';
import {SafeArea, Kicker, Panel} from '../layout';
import {useReveal, useSequencedReveal} from '../motion';

export const QuizQuestionProps = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
});

export function QuizQuestion({data, theme}: VisualComponentProps<z.infer<typeof QuizQuestionProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0, type: 'slide-up'});
  const options = data.options.slice(0, 4);
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, transform: `translateY(${r.translateY}px)`, maxWidth: 1500, width: '100%'}}>
        <Kicker text="Check your understanding" theme={theme} />
        <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 58, color: theme.colors.text, marginTop: theme.spacing.sm}}>
          {data.question}
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginTop: theme.spacing.xl}}>
          {options.map((option, i) => {
            const s = useSequencedReveal(i, 10);
            return (
              <Panel key={i} theme={theme} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md}}>
                <div style={{width: 44, height: 44, borderRadius: 22, border: `3px solid ${theme.colors.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: theme.colors.primary, fontWeight: 700}}>
                  {String.fromCharCode(65 + i)}
                </div>
                <div style={{fontSize: 30, color: theme.colors.text}}>{option}</div>
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
        <Panel theme={theme} style={{borderTop: `6px solid #4ADE80`, gap: theme.spacing.sm}}>
          <div style={{fontSize: 28, color: theme.colors.muted}}>{data.question}</div>
          <div style={{display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.sm}}>
            <div style={{width: 64, height: 64, borderRadius: 32, background: '#4ADE80', color: '#08111F', fontSize: 34, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              ✓
            </div>
            <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 48, color: '#4ADE80'}}>{data.correct}</div>
          </div>
          {data.explanation ? (
            <div style={{fontSize: 28, color: theme.colors.text, marginTop: theme.spacing.sm}}>{data.explanation}</div>
          ) : null}
        </Panel>
      </div>
    </SafeArea>
  );
}
