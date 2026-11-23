import { Action, ActionPanel, Form, Icon, open, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { homedir } from "node:os";
import { useState } from "react";
import {
  FormatDropdown,
  LanguageDropdown,
  ModelDropdown,
  TriStateDropdown,
} from "./components/TranscriptionOptionFields";
import { finderFolder, isDirectory } from "./lib/files";
import { errorMessage, expandHome, OutputFormat, transcribeDirectory } from "./lib/mw";
import { fromTriState } from "./lib/options";

type FormValues = {
  folder: string;
  outputFolder: string;
  recursive: boolean;
  overwrite: boolean;
  model: string;
  language: string;
  format: OutputFormat;
  speakers: string;
};

/** Shows paths under the home folder as `~/…`, the way they can be typed back. */
function displayPath(path: string): string {
  const home = homedir();
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

// Folders are typed paths rather than Form.FilePicker: the macOS open panel hides Raycast, and users whose
// "Pop to Root Search" timeout is set to immediately lose the whole form when it closes.
export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [folderError, setFolderError] = useState<string>();
  const [outputError, setOutputError] = useState<string>();
  const { data: initialFolder, isLoading: isLoadingFinder } = usePromise(finderFolder);

  async function handleSubmit(values: FormValues) {
    const folder = expandHome(values.folder.trim());
    const outputDir = values.outputFolder.trim() ? expandHome(values.outputFolder.trim()) : folder;
    const nextFolderError = !folder ? "Enter a folder" : isDirectory(folder) ? undefined : "Folder not found";
    const nextOutputError = isDirectory(outputDir) || outputDir === folder ? undefined : "Folder not found";
    setFolderError(nextFolderError);
    setOutputError(nextOutputError);
    if (nextFolderError || nextOutputError) {
      await showToast({ style: Toast.Style.Failure, title: nextFolderError ?? "Output folder not found" });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Transcribing folder…",
      message: "This can take a while for long recordings",
    });
    try {
      const written = await transcribeDirectory(folder, {
        outputDir,
        recursive: values.recursive,
        overwrite: values.overwrite,
        model: values.model,
        language: values.language,
        format: values.format,
        speakers: fromTriState(values.speakers),
      });
      toast.style = Toast.Style.Success;
      toast.title = written.length === 1 ? "1 transcript written" : `${written.length} transcripts written`;
      toast.message = outputDir;
      toast.primaryAction = { title: "Open Output Folder", onAction: () => open(outputDir) };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Batch transcription failed";
      toast.message = errorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Wait for Finder so the folder field gets its default value on first render.
  if (isLoadingFinder) return <Form isLoading />;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transcribe Folder" icon={Icon.Folder} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="folder"
        title="Folder"
        placeholder="~/Movies/Interviews"
        info="Open or select a folder in Finder before launching this command to fill it in."
        defaultValue={initialFolder ? displayPath(initialFolder) : ""}
        error={folderError}
        onChange={() => setFolderError(undefined)}
      />
      <Form.Checkbox id="recursive" title="Subfolders" label="Include subfolders" defaultValue={false} storeValue />
      <Form.TextField
        id="outputFolder"
        title="Output Folder"
        placeholder="Same as the source folder"
        info="Leave empty to write the transcripts next to the recordings."
        error={outputError}
        onChange={() => setOutputError(undefined)}
      />
      <FormatDropdown defaultValue="srt" />
      <Form.Checkbox
        id="overwrite"
        title="Existing Files"
        label="Overwrite existing transcripts"
        defaultValue={false}
      />
      <Form.Separator />
      <ModelDropdown />
      <LanguageDropdown />
      <TriStateDropdown id="speakers" title="Speaker Detection" />
    </Form>
  );
}
