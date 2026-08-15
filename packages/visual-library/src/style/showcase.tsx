import {AbsoluteFill, Sequence} from 'remotion';
import type {Theme} from '../theme';
import {resolveTheme} from './registry';
import {rootBackgroundStyle} from '../styling';
import {TitleHero} from '../components/typography';
import {ProcessFlow} from '../components/explanation';
import {NumberCounter, LineChart} from '../components/quantitative';
import {KeyTakeaway} from '../components/typography';
import {SafeArea} from '../layout';
import {loadProjectFonts} from '../fonts';

export const SHOWCASE_FPS = 30;
export const SHOWCASE_DURATION_IN_FRAMES = 240;
export const SHOWCASE_SCENE_FRAMES = 40;

/**
 * Deterministic style showcase: the same miniature explanation rendered in any
 * registered style. Used for the project-creation gallery, template gallery,
 * settings and marketing surfaces. No AI involved — the data is fixed.
 */
export function StyleShowcase(props: {styleId: string; aspectRatio?: '16:9' | '9:16'}) {
  const theme: Theme = resolveTheme(props.styleId);
  const aspectRatio = props.aspectRatio ?? '16:9';
  return (
    <AbsoluteFill style={rootBackgroundStyle(theme)}>
      <Sequence from={0} durationInFrames={SHOWCASE_SCENE_FRAMES}>
        <TitleHero
          data={{kicker: 'Concepts · Finance', title: 'Why compound interest accelerates', subtitle: aspectRatio === '9:16' ? 'A 2-minute visual explanation' : 'A short visual explanation of exponential growth'}}
          theme={theme}
          durationInFrames={SHOWCASE_SCENE_FRAMES}
        />
      </Sequence>
      <Sequence from={SHOWCASE_SCENE_FRAMES} durationInFrames={SHOWCASE_SCENE_FRAMES}>
        <ProcessFlow
          data={{title: 'The compounding loop', steps: ['Interest is earned', 'Interest earns interest', 'Growth accelerates']}}
          theme={theme}
          durationInFrames={SHOWCASE_SCENE_FRAMES}
        />
      </Sequence>
      <Sequence from={SHOWCASE_SCENE_FRAMES * 2} durationInFrames={SHOWCASE_SCENE_FRAMES}>
        <NumberCounter
          data={{title: 'Balance after 10 years at 5%', value: 1610, unit: '$', caption: 'Starting with $1,000 — returns now earn returns of their own'}}
          theme={theme}
          durationInFrames={SHOWCASE_SCENE_FRAMES}
        />
      </Sequence>
      <Sequence from={SHOWCASE_SCENE_FRAMES * 3} durationInFrames={SHOWCASE_SCENE_FRAMES}>
        <LineChart
          data={{title: 'Exponential growth curve', series: [{label: 'Y1', value: 1000}, {label: 'Y2', value: 1050}, {label: 'Y3', value: 1103}, {label: 'Y4', value: 1158}, {label: 'Y5', value: 1216}, {label: 'Y6', value: 1276}, {label: 'Y7', value: 1340}, {label: 'Y8', value: 1407}, {label: 'Y9', value: 1477}, {label: 'Y10', value: 1610}], unit: '$'}}
          theme={theme}
          durationInFrames={SHOWCASE_SCENE_FRAMES}
        />
      </Sequence>
      <Sequence from={SHOWCASE_SCENE_FRAMES * 4} durationInFrames={SHOWCASE_SCENE_FRAMES}>
        <KeyTakeaway
          data={{title: 'Why it accelerates', text: 'Reinvested returns earn returns themselves, so the balance grows by a larger amount every year.'}}
          theme={theme}
          durationInFrames={SHOWCASE_SCENE_FRAMES}
        />
      </Sequence>
      <Sequence from={SHOWCASE_SCENE_FRAMES * 5} durationInFrames={SHOWCASE_SCENE_FRAMES}>
        <SafeArea theme={theme} center>
          <div style={{textAlign: 'center'}}>
            <div style={{fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: theme.typography.heading, color: theme.colors.text}}>
              Time turns small steps into big growth
            </div>
          </div>
        </SafeArea>
      </Sequence>
    </AbsoluteFill>
  );
}
