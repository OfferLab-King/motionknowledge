import {z} from 'zod';
import {interpolate, useCurrentFrame} from 'remotion';
import type {VisualComponentProps} from '../types';
import {fonts, type Theme} from '../theme';
import {SafeArea, Kicker, Panel} from '../layout';
import {useReveal, useSequencedReveal} from '../motion';

export const CodeBlockProps = z.object({
  title: z.string().default('Code'),
  language: z.string().default('ts'),
  code: z.string().min(1),
});

export function CodeBlock({data, theme}: VisualComponentProps<z.infer<typeof CodeBlockProps>>) {
  const frame = useCurrentFrame();
  const lines = data.code.split('\n').slice(0, 10);
  const r = useReveal({startFrame: 0});
  return (
    <SafeArea theme={theme}>
      <div style={{opacity: r.opacity}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <Kicker text={data.title} theme={theme} />
          <div style={{fontFamily: fonts.mono, fontSize: 22, color: theme.colors.muted}}>{data.language}</div>
        </div>
        <div style={{background: '#0A1526', border: `1px solid ${theme.colors.surface}`, borderRadius: theme.radius.md, padding: theme.spacing.lg, marginTop: theme.spacing.md, fontFamily: fonts.mono, fontSize: 30, lineHeight: 1.5, overflow: 'hidden'}}>
          {lines.map((line, i) => {
            const s = useSequencedReveal(i, 4);
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
        <div style={{background: '#0A1526', borderRadius: theme.radius.md, border: `1px solid ${theme.colors.surface}`, overflow: 'hidden'}}>
          <div style={{display: 'flex', gap: 8, padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, background: theme.colors.surface}}>
            <div style={{width: 14, height: 14, borderRadius: 7, background: '#FB7185'}} />
            <div style={{width: 14, height: 14, borderRadius: 7, background: '#F7C948'}} />
            <div style={{width: 14, height: 14, borderRadius: 7, background: '#4ADE80'}} />
            <div style={{fontFamily: fonts.mono, fontSize: 20, color: theme.colors.muted, marginLeft: theme.spacing.md}}>{data.title}</div>
          </div>
          <div style={{padding: theme.spacing.lg, fontFamily: fonts.mono, fontSize: 28, lineHeight: 1.6}}>
            {data.lines.slice(0, 8).map((line, i) => {
              const s = useSequencedReveal(i, 6);
              return (
                <div key={i} style={{opacity: s.opacity, color: line.prompt ? theme.colors.primary : theme.colors.text}}>
                  {line.prompt ? <span style={{color: theme.colors.accent}}>$ </span> : null}
                  {line.text}
                </div>
              );
            })}
            <div style={{width: 12, height: 26, background: theme.colors.primary, opacity: 0.8, animation: undefined}} />
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
        <div style={{background: theme.colors.surface, borderRadius: theme.radius.md, overflow: 'hidden'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.sm, background: '#0A1526'}}>
            <div style={{display: 'flex', gap: 8}}>
              <div style={{width: 13, height: 13, borderRadius: 7, background: '#FB7185'}} />
              <div style={{width: 13, height: 13, borderRadius: 7, background: '#F7C948'}} />
              <div style={{width: 13, height: 13, borderRadius: 7, background: '#4ADE80'}} />
            </div>
            <div style={{flex: 1, background: theme.colors.surface, borderRadius: 8, padding: '6px 14px', fontFamily: fonts.mono, fontSize: 22, color: theme.colors.muted, textAlign: 'center'}}>
              {data.url}
            </div>
          </div>
          <div style={{height: 360, background: 'linear-gradient(135deg, #10213A, #08111F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, color: theme.colors.muted}}>
            {data.title}
          </div>
        </div>
        {data.caption ? (
          <div style={{textAlign: 'center', fontSize: 26, color: theme.colors.muted, marginTop: theme.spacing.md}}>{data.caption}</div>
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
        <div style={{width: 760, height: 440, background: 'linear-gradient(135deg, #10213A, #08111F)', border: `2px solid ${theme.colors.surface}`, borderRadius: theme.radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: theme.colors.muted}}>
          {data.title}
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.md}}>
          <div style={{fontSize: 34, color: theme.colors.text, maxWidth: 560}}>{data.caption}</div>
          {data.callouts.slice(0, 4).map((callout, i) => {
            const s = useSequencedReveal(i);
            return (
              <div key={i} style={{opacity: s.opacity, transform: `translateY(${s.translateY}px)`, display: 'flex', gap: theme.spacing.sm, alignItems: 'center'}}>
                <div style={{width: 12, height: 12, borderRadius: 6, background: theme.colors.accent}} />
                <div style={{fontSize: 26, color: theme.colors.muted}}>{callout}</div>
              </div>
            );
          })}
        </div>
      </div>
    </SafeArea>
  );
}
