'use client';

import {useState} from 'react';
import {listStyles} from '@motionknowledge/visual-library/style';
import {StylePreview} from './StylePreview';

const styles = listStyles();

export function StyleGallery(props: {
  initialStyleId?: string;
  onSelect: (styleId: string) => void;
}) {
  const [selected, setSelected] = useState(props.initialStyleId ?? 'signature');
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {styles.map((style) => {
        const active = selected === style.id;
        const previewing = hovered === style.id;
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => {
              setSelected(style.id);
              props.onSelect(style.id);
            }}
            onMouseEnter={() => setHovered(style.id)}
            onMouseLeave={() => setHovered(null)}
            aria-pressed={active}
            aria-label={`Style: ${style.name}`}
            className={`rounded-xl border p-3 text-left transition-colors ${
              active ? 'border-[#59d5e0] bg-[#10213a]' : 'border-[#2a4568] bg-[#0f1c30] hover:border-[#3a5b82]'
            }`}
          >
            <StylePreview styleId={style.id} width={280} height={158} autoplay={previewing || active} />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#f8fafc]">{style.name}</div>
              {active ? (
                <span className="rounded-full bg-[#59d5e0] px-2 py-0.5 text-[10px] font-bold text-[#06202b]">Selected</span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-3 text-xs text-[#9fb2c8]">{style.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {style.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded bg-[#1b3350] px-1.5 py-0.5 text-[10px] text-[#9fb2c8]">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
