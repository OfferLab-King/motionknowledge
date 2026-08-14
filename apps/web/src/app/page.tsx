import Link from 'next/link';
import {brand} from '@motionknowledge/config';
import {listTemplates} from '@motionknowledge/content-engine/templates';
import {listStyles} from '@motionknowledge/visual-library/style';
import {StylePreview} from '../components/projects/StylePreview';

const styles = listStyles();
const templates = listTemplates();

export default function LandingPage() {
  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <section className="flex flex-col items-center text-center">
          <div className="mb-6 rounded-full border border-[#2a4568] bg-[#0f1c30] px-4 py-1.5 text-xs text-[#9fb2c8]">
            Formats · Visual styles · Templates — all deterministic
          </div>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-tight text-[#f8fafc]">
            Turn knowledge into <span className="text-[#59d5e0]">explained video</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[#9fb2c8]">
            {brand.productName} compiles a topic into grounded claims, an editable script, deterministic
            visuals, timed narration, and a finished video you can review before anyone sees it.
          </p>
          <div className="mt-10 flex gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-[#59d5e0] px-6 py-3 font-semibold text-[#08111f] hover:bg-[#4bc4d0]"
            >
              Start creating
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-[#2a4568] bg-[#10213a] px-6 py-3 font-semibold text-[#f8fafc] hover:bg-[#1a3050]"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="mt-20">
          <div className="overflow-hidden rounded-2xl border border-[#2a4568] shadow-2xl">
            <StylePreview styleId="signature" width={960} height={540} autoplay className="mx-auto" />
          </div>
          <p className="mt-3 text-center text-xs text-[#9fb2c8]">
            The same explanation rendered deterministically in every style — no AI previews.
          </p>
        </section>

        <section className="mt-20">
          <h2 className="mb-1 text-2xl font-bold text-[#f8fafc]">Every style, one explanation</h2>
          <p className="mb-6 text-sm text-[#9fb2c8]">
            Start from a template and switch styles at any time — previews and final renders always match.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {styles.map((style) => (
              <div key={style.id} className="overflow-hidden rounded-xl border border-[#2a4568] bg-[#0f1c30]">
                <StylePreview styleId={style.id} width={280} height={158} />
                <div className="p-3">
                  <div className="text-sm font-semibold text-[#f8fafc]">{style.name}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-[#9fb2c8]">{style.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-1 text-2xl font-bold text-[#f8fafc]">Start from a template</h2>
          <p className="mb-6 text-sm text-[#9fb2c8]">
            Templates recommend a format and a style; you keep full control afterwards.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {templates.slice(0, 8).map((template) => (
              <div key={template.id} className="overflow-hidden rounded-xl border border-[#2a4568] bg-[#0f1c30]">
                <StylePreview styleId={template.defaultStyleId} width={200} height={113} />
                <div className="p-3">
                  <div className="text-sm font-semibold text-[#f8fafc]">{template.name}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-[#9fb2c8]">{template.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            ['Grounded claims', 'Every scene traces to researched sources; nothing is invented on screen.'],
            ['Editable stages', 'Outline, script, storyboard, narration and scenes stay editable and versioned.'],
            ['Review before render', 'Preview scenes in the browser Player, approve, then render MP4 + SRT.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-[#2a4568] bg-[#0f1c30] p-5">
              <div className="font-semibold text-[#f8fafc]">{title}</div>
              <p className="mt-2 text-sm text-[#9fb2c8]">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 flex flex-col items-center text-center">
          <Link
            href="/register"
            className="rounded-lg bg-[#59d5e0] px-8 py-3 font-semibold text-[#08111f] hover:bg-[#4bc4d0]"
          >
            Create your first video
          </Link>
        </section>
      </div>
    </div>
  );
}
