'use client';

import {Player} from '@remotion/player';
import {ProjectComposition} from '@motionknowledge/remotion-engine/browser';
import type {RenderManifest} from '@motionknowledge/schemas';

export interface PreviewManifest extends RenderManifest {
  audioUrls?: Record<string, string>;
}

export function Preview({manifest}: {manifest: PreviewManifest | null}) {
  const audioUrls = manifest?.audioUrls ?? {};

  if (!manifest) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-[#2a4568] bg-[#0a1526] text-sm text-[#9fb2c8]">
        Preview not available yet — run the generation pipeline first.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#2a4568] bg-black">
      <Player
        component={ProjectComposition as never}
        inputProps={{manifest, audioUrls}}
        durationInFrames={manifest.totalDurationInFrames}
        fps={manifest.fps}
        compositionWidth={manifest.width}
        compositionHeight={manifest.height}
        style={{width: '100%'}}
        controls
        loop
      />
    </div>
  );
}
