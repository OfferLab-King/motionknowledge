import {Card, Field, Select, TextInput, Button} from '@motionknowledge/ui';
import {listMacVoices} from '@motionknowledge/tts';
import {createProjectAction} from '../../../../services/projects';

export default async function NewProjectPage() {
  const voices = await listMacVoices();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-[#f8fafc]">Create a video</h1>
      <p className="mb-8 text-[#9fb2c8]">
        We will research, outline, script, storyboard, narrate, and preview the project before you
        render it.
      </p>
      <Card>
        <form action={createProjectAction} className="space-y-5">
          <Field label="Topic" hint="A subject, pasted text, or a source URL.">
            <TextInput name="title" placeholder="What is a Discounted Cash Flow?" required aria-label="Topic" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
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
              <TextInput name="language" defaultValue="en" aria-label="Language" />
            </Field>
            <Field label="Tone">
              <Select name="tone" defaultValue="professional" aria-label="Tone">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="energetic">Energetic</option>
              </Select>
            </Field>
            <Field label="Style">
              <Select name="style" defaultValue="professional" aria-label="Style">
                <option value="professional">Professional</option>
                <option value="minimal">Minimal</option>
                <option value="bold">Bold</option>
              </Select>
            </Field>
            <Field label="Aspect ratio">
              <Select name="aspectRatio" defaultValue="16:9" aria-label="Aspect ratio">
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
              </Select>
            </Field>
            <Field label="Narration voice" hint="Free on-device voices; neural voices appear when Google/ElevenLabs are configured.">
              <Select name="voice" defaultValue="Samantha" aria-label="Narration voice">
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="submit" className="w-full">
            Create project
          </Button>
        </form>
      </Card>
    </div>
  );
}
