import { FileSource } from "./components/FileSource";
import { TranscriptionView } from "./components/TranscriptionView";
import { MEETING_NOTES_OPTIONS } from "./lib/presets";

export default function Command() {
  return (
    <FileSource actionTitle="Create Meeting Notes">
      {(paths) => <TranscriptionView paths={paths} options={MEETING_NOTES_OPTIONS} />}
    </FileSource>
  );
}
