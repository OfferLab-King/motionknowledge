import {Card, Field, Select, TextInput, Button} from '@motionknowledge/ui';
import {listMacVoices} from '@motionknowledge/tts';
import {listFormats} from '@motionknowledge/content-engine/formats';
import {SUPPORTED_LANGUAGES} from '@motionknowledge/content-engine/languages';
import {createProjectAction} from '../../../../services/projects';
import {NewProjectForm} from '../../../../components/projects/NewProjectForm';

export default async function NewProjectPage() {
  const voices = await listMacVoices();
  const formats = listFormats();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-[#f8fafc]">Create a video</h1>
      <p className="mb-8 text-[#9fb2c8]">
        Start from a template, pick a visual style, and we will research, outline, script, storyboard,
        narrate, and preview the project before you render it.
      </p>
      <NewProjectForm
        voices={voices.map((voice) => ({id: voice.id, label: voice.label}))}
        formats={formats.map((format) => ({id: format.id, name: format.name, description: format.description}))}
        languages={SUPPORTED_LANGUAGES.map((lang) => ({code: lang.code, name: lang.name}))}
      />
    </div>
  );
}
