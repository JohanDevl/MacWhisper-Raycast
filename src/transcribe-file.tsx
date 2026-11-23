import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { basename } from "node:path";
import {
  FormatDropdown,
  LanguageDropdown,
  ModelDropdown,
  TriStateDropdown,
} from "./components/TranscriptionOptionFields";
import { TranscriptDetail, TranscriptResult } from "./components/TranscriptDetail";
import { errorMessage, OutputFormat, transcribeFile } from "./lib/mw";
import { fromTriState } from "./lib/options";

type FormValues = {
  files: string[];
  model: string;
  language: string;
  format: OutputFormat;
  speakers: string;
  timestamps: string;
  persist: boolean;
};

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (values.files.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Pick at least one file" });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Transcribing…" });
    const results: TranscriptResult[] = [];
    try {
      for (const [index, path] of values.files.entries()) {
        toast.message = `${index + 1}/${values.files.length} — ${basename(path)}`;
        const transcript = await transcribeFile(path, {
          model: values.model,
          language: values.language,
          format: values.format,
          speakers: fromTriState(values.speakers),
          timestamps: fromTriState(values.timestamps),
          persist: values.persist,
        });
        results.push({ path, transcript });
      }
      toast.style = Toast.Style.Success;
      toast.title = results.length === 1 ? "Transcription complete" : `${results.length} files transcribed`;
      toast.message = undefined;
      push(<TranscriptDetail results={results} format={values.format} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Transcription failed";
      toast.message = errorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transcribe" icon={Icon.Microphone} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Audio or Video" allowMultipleSelection canChooseDirectories={false} />
      <ModelDropdown />
      <LanguageDropdown />
      <FormatDropdown />
      <Form.Separator />
      <TriStateDropdown id="speakers" title="Speaker Detection" />
      <TriStateDropdown id="timestamps" title="Timestamps" />
      <Form.Checkbox
        id="persist"
        title="History"
        label="Save to MacWhisper history"
        defaultValue={getPreferenceValues<Preferences>().saveToHistory}
      />
    </Form>
  );
}
