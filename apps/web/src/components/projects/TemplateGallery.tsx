'use client';

import {useState} from 'react';
import {listTemplates} from '@motionknowledge/content-engine/templates';
import {StylePreview} from './StylePreview';

const templates = listTemplates();

export function TemplateGallery(props: {
  initialTemplateId?: string;
  onSelect: (template: {templateId: string | null; styleId: string; format: string}) => void;
}) {
  const [selected, setSelected] = useState<string | null>(props.initialTemplateId ?? 'modern-explainer');
  const [hovered, setHovered] = useState<string | null>(null);

  function choose(templateId: string) {
    setSelected(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      props.onSelect({templateId: template.id, styleId: template.defaultStyleId, format: template.recommendedFormat});
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {templates.map((template) => {
          const active = selected === template.id;
          const previewing = hovered === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => choose(template.id)}
              onMouseEnter={() => setHovered(template.id)}
              onMouseLeave={() => setHovered(null)}
              aria-pressed={active}
              aria-label={`Template: ${template.name}`}
              className={`rounded-xl border p-3 text-left transition-colors ${
                active ? 'border-[#59d5e0] bg-[#10213a]' : 'border-[#2a4568] bg-[#0f1c30] hover:border-[#3a5b82]'
              }`}
            >
              <StylePreview styleId={template.defaultStyleId} width={200} height={113} autoplay={previewing || active} />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-[#f8fafc]">{template.name}</div>
                {active ? (
                  <span className="rounded-full bg-[#59d5e0] px-2 py-0.5 text-[10px] font-bold text-[#06202b]">Selected</span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-[#9fb2c8]">{template.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {template.bestFor.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded bg-[#1b3350] px-1.5 py-0.5 text-[10px] text-[#9fb2c8]">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[#9fb2c8]">
        Templates are a starting point: you can change the style or format at any time.
      </p>
    </div>
  );
}
