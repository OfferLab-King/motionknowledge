import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import type {Theme} from '../theme';
import {SafeArea, Kicker} from '../layout';
import {useReveal, useSequencedReveal} from '../motion';
import {SketchBox} from './variants';

function chromeBar(theme: Theme) {
  return (
    <div style={{display: 'flex', gap: 8, padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, background: theme.colors.surfaceAlt, borderBottom: `1px solid ${theme.surfaces.borderColor}`}}>
      <div style={{width: 14, height: 14, borderRadius: 7, background: theme.colors.danger}} />
      <div style={{width: 14, height: 14, borderRadius: 7, background: theme.colors.accent}} />
      <div style={{width: 14, height: 14, borderRadius: 7, background: theme.colors.success}} />
    </div>
  );
}

export const CodeBlockProps = z.object({
  title: z.string().default('Code'),
  language: z.string().default('ts'),
  code: z.string().min(1),
});

export function CodeBlock({data, theme}: VisualComponentProps<z.infer<typeof CodeBlockProps>>) {
  const frame = useCurrentFrame();
  const lines = data.code.split('\n').slice(0, 10);
  const r = useReveal({startFrame: 0});
  const handDrawn = theme.visualLanguage === 'hand-drawn';
  return (
    <SafeArea theme={theme}>
      <div style={{opacity: r.opacity}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <Kicker text={data.title} theme={theme} />
          <div style={{fontFamily: theme.fonts.mono, fontSize: 22, color: theme.colors.muted}}>{data.language}</div>
        </div>
        {handDrawn ? (
          <div style={{position: 'relative', marginTop: theme.spacing.md}}>
            <SketchBox theme={theme} seed={31} width={1400} height={Math.min(560, lines.length * 54 + 40)} color={theme.colors.muted} startFrame={4} durationFrames={36}>
              <div style={{position: 'absolute', inset: 20, fontFamily: theme.fonts.mono, fontSize: 30, lineHeight: 1.5, overflow: 'hidden'}}>
                {lines.map((line, i) => {
                  const s = useSequencedReveal(i, 4, theme.motion.spring);
                  const trimmed = line.trimStart();
                  const indent = line.length - trimmed.length;
                  return (
                    <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, color: theme.colors.text, whiteSpace: 'pre', paddingLeft: indent * 14}}>
                      <span style={{color: theme.colors.muted, marginRight: theme.spacing.md, display: 'inline-block', width: 24}}>{i + 1}</span>
                      {trimmed}
                    </div>
                  );
                })}
              </div>
            </SketchBox>
          </div>
        ) : (
          <div style={{background: theme.colors.surfaceAlt, border: `1px solid ${theme.surfaces.borderColor}`, borderRadius: theme.radius.md, padding: theme.spacing.lg, marginTop: theme.spacing.md, fontFamily: theme.fonts.mono, fontSize: 30, lineHeight: 1.5, overflow: 'hidden'}}>
            {lines.map((line, i) => {
              const s = useSequencedReveal(i, 4, theme.motion.spring);
              const trimmed = line.trimStart();
              const indent = line.length - trimmed.length;
              return (
                <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, color: theme.colors.text, whiteSpace: 'pre', paddingLeft: indent * 14}}>
                  <span style={{color: theme.colors.muted, marginRight: theme.spacing.md, display: 'inline-block', width: 24}}>{i + 1}</span>
                  {trimmed}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SafeArea>
  );
}

export const TerminalDemoProps = z.object({
  title: z.string().default('Terminal'),
  lines: z.array(z.object({prompt: z.boolean().default(true), text: z.string()})).min(1),
});

export function TerminalDemo({data, theme}: VisualComponentProps<z.infer<typeof TerminalDemoProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0});
  return (
    <SafeArea theme={theme}>
      <div style={{opacity: r.opacity}}>
        <div style={{background: theme.colors.surfaceAlt, borderRadius: theme.radius.md, border: `1px solid ${theme.surfaces.borderColor}`, overflow: 'hidden'}}>
          {chromeBar(theme)}
          <div style={{padding: theme.spacing.lg, fontFamily: theme.fonts.mono, fontSize: 28, lineHeight: 1.6}}>
            {data.lines.slice(0, 8).map((line, i) => {
              const s = useSequencedReveal(i, 6, theme.motion.spring);
              return (
                <div key={i} style={{opacity: s.opacity, color: line.prompt ? theme.colors.primary : theme.colors.text}}>
                  {line.prompt ? <span style={{color: theme.colors.accent}}>$ </span> : null}
                  {line.text}
                </div>
              );
            })}
            <div style={{width: 12, height: 26, background: theme.colors.primary, opacity: 0.8}} />
          </div>
        </div>
      </div>
    </SafeArea>
  );
}

export const BrowserFrameProps = z.object({
  title: z.string().default('Browser'),
  url: z.string().default('https://example.com'),
  caption: z.string().default(''),
});

export function BrowserFrame({data, theme}: VisualComponentProps<z.infer<typeof BrowserFrameProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0, type: 'scale'});
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, transform: `scale(${r.scale})`, width: 1400}}>
        <div style={{background: theme.colors.surface, borderRadius: theme.radius.md, overflow: 'hidden', border: `1px solid ${theme.surfaces.borderColor}`, boxShadow: theme.shadows.md}}>
          <div style={{display: 'flex', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.sm, background: theme.colors.surfaceAlt}}>
            <div style={{display: 'flex', gap: 8}}>
              <div style={{width: 13, height: 13, borderRadius: 7, background: theme.colors.danger}} />
              <div style={{width: 13, height: 13, borderRadius: 7, background: theme.colors.accent}} />
              <div style={{width: 13, height: 13, borderRadius: 7, background: theme.colors.success}} />
            </div>
            <div style={{flex: 1, background: theme.colors.surface, borderRadius: 8, padding: '6px 14px', fontFamily: theme.fonts.mono, fontSize: 22, color: theme.colors.muted, textAlign: 'center'}}>
              {data.url}
            </div>
          </div>
          <div style={{height: 360, background: theme.visualLanguage === 'hand-drawn' ? theme.colors.background : `linear-gradient(135deg, ${theme.colors.surfaceAlt}, ${theme.colors.background})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, color: theme.colors.muted, fontFamily: theme.fonts.body}}>
            {data.title}
          </div>
        </div>
        {data.caption ? (
          <div style={{textAlign: 'center', fontSize: theme.typography.caption, color: theme.colors.muted, marginTop: theme.spacing.md, fontFamily: theme.fonts.body}}>{data.caption}</div>
        ) : null}
      </div>
    </SafeArea>
  );
}

export const ScreenshotCalloutProps = z.object({
  title: z.string().default('Screenshot'),
  caption: z.string().min(1),
  callouts: z.array(z.string()).default([]),
});

export function ScreenshotCallout({data, theme}: VisualComponentProps<z.infer<typeof ScreenshotCalloutProps>>) {
  const frame = useCurrentFrame();
  const r = useReveal({startFrame: 0});
  return (
    <SafeArea theme={theme} center>
      <div style={{opacity: r.opacity, display: 'flex', gap: theme.spacing.xl, alignItems: 'center'}}>
        <div style={{width: 760, height: 440, background: theme.visualLanguage === 'hand-drawn' ? theme.colors.background : `linear-gradient(135deg, ${theme.colors.surfaceAlt}, ${theme.colors.background})`, border: `2px solid ${theme.surfaces.borderColor}`, borderRadius: theme.radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: theme.colors.muted, fontFamily: theme.fonts.body}}>
          {data.title}
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.md}}>
          <div style={{fontSize: theme.typography.subheading, color: theme.colors.text, maxWidth: 560, fontFamily: theme.fonts.body}}>{data.caption}</div>
          {data.callouts.slice(0, 4).map((callout, i) => {
            const s = useSequencedReveal(i, 8, theme.motion.spring);
            return (
              <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, display: 'flex', gap: theme.spacing.sm, alignItems: 'center'}}>
                <div style={{width: 12, height: 12, borderRadius: 6, background: theme.colors.accent}} />
                <div style={{fontSize: theme.typography.caption, color: theme.colors.muted, fontFamily: theme.fonts.body}}>{callout}</div>
              </div>
            );
          })}
        </div>
      </div>
    </SafeArea>
  );
}
