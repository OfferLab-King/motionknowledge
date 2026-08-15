'use client';

import {useState} from 'react';
import {Card, Field, Select, TextInput, Button} from '@motionknowledge/ui';
import {TemplateGallery} from './TemplateGallery';
import {StyleGallery} from './StyleGallery';
import {createProjectAction} from '../../services/projects';
import {VoiceSelect} from './VoiceSelect';

export function NewProjectForm(props: {
  formats: Array<{id: string; name: string; description: string}>;
  languages: Array<{code: string; name: string}>;
}) {
  const [templateChoice, setTemplateChoice] = useState<{templateId: string | null; styleId: string; format: string}>({
    templateId: 'modern-explainer',
    styleId: 'signature',
    format: 'explainer',
  });
  const [styleId, setStyleId] = useState('signature');
  const [sourceType, setSourceType] = useState('topic');
  const [language, setLanguage] = useState('en');

  return (
    <form action={createProjectAction} className="space-y-8">
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-[#f8fafc]">1 · Choose a template</h2>
        <input type="hidden" name="templateId" value={templateChoice.templateId ?? ''} />
        <TemplateGallery
          initialTemplateId={templateChoice.templateId ?? 'modern-explainer'}
          onSelect={(choice) => {
            setTemplateChoice(choice);
            setStyleId(choice.styleId);
          }}
        />
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#f8fafc]">2 · Choose a visual style</h2>
          <span className="text-xs text-[#9fb2c8]">You can change this later per project or per scene.</span>
        </div>
        <input type="hidden" name="styleId" value={styleId} />
        <StyleGallery initialStyleId={styleId} onSelect={setStyleId} />
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-[#f8fafc]">3 · Details</h2>
        <div className="space-y-5">
          <Field label="Source type" hint="Topic-only research, or ground the video in material you provide.">
            <Select name="sourceType" defaultValue="topic" aria-label="Source type" onChange={(event) => setSourceType(event.target.value)}>
              <option value="topic">Topic only (research finds sources)</option>
              <option value="text">Paste source text</option>
              <option value="url">Source URL</option>
              <option value="file">Upload a file (PDF, DOCX, PPTX, TXT, MD, CSV, JSON)</option>
            </Select>
          </Field>
          {sourceType === 'text' ? (
            <Field label="Source text" hint="Claims will be extracted from this material first; research supplements it.">
              <textarea
                name="sourceText"
                aria-label="Source text"
                rows={6}
                placeholder="Paste an article, paper or notes (at least ~40 characters)…"
                className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-[#f8fafc] outline-none focus:border-[#59d5e0]"
              />
            </Field>
          ) : null}
          {sourceType === 'url' ? (
            <Field label="Source URL" hint="Fetched with SSRF-safe ingestion and stored with its provenance.">
              <TextInput name="sourceUrl" type="url" placeholder="https://example.com/article" aria-label="Source URL" />
            </Field>
          ) : null}
          {sourceType === 'file' ? (
            <Field label="Source file" hint="Up to 25 MB. Content is sniffed by magic bytes; HTML/SVG/scripts are rejected.">
              <input
                type="file"
                name="sourceFile"
                aria-label="Source file"
                accept=".pdf,.docx,.pptx,.txt,.md,.csv,.json"
                className="block w-full text-sm text-[#f8fafc] file:mr-3 file:rounded-lg file:border-0 file:bg-[#10213a] file:px-3 file:py-2 file:text-[#59d5e0]"
              />
            </Field>
          ) : null}
          <Field label="Topic" hint="A subject, pasted text, or a source URL.">
            <TextInput name="title" placeholder="What is a Discounted Cash Flow?" required aria-label="Topic" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Format" hint={props.formats.find((f) => f.id === templateChoice.format)?.description}>
              <Select
                name="format"
                defaultValue={templateChoice.format}
                onChange={(event) => setTemplateChoice((prev) => ({...prev, format: event.target.value}))}
                aria-label="Format"
              >
                {props.formats.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Audience">
              <Select name="audienceLevel" defaultValue="beginner" aria-label="Audience">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </Field>
            <Field label="Duration">
              <Select name="duration" defaultValue="5" aria-label="Duration">
                <option value="3">3 minutes</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
              </Select>
            </Field>
            <Field label="Language">
              <Select
                name="language"
                defaultValue="en"
                aria-label="Language"
                onChange={(event) => setLanguage(event.target.value)}
              >
                {props.languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tone">
              <Select name="tone" defaultValue="professional" aria-label="Tone">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="energetic">Energetic</option>
              </Select>
            </Field>
            <Field label="Aspect ratio">
              <Select name="aspectRatio" defaultValue="16:9" aria-label="Aspect ratio">
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
              </Select>
            </Field>
            <Field label="Narration voice" hint="Neural and premium voices appear when provider keys are configured.">
              <VoiceSelect language={language} />
            </Field>
          </div>
          <Button type="submit" className="w-full">
            Create project
          </Button>
        </div>
      </Card>
    </form>
  );
}
