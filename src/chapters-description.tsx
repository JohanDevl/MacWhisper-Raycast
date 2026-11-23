import { FileSource } from "./components/FileSource";
import { RecordingAIView } from "./components/RecordingAIView";

export default function Command() {
  return (
    <FileSource actionTitle="Create Chapters & Description" allowMultiple={false}>
      {(paths) => <RecordingAIView paths={paths} task="chapters" />}
    </FileSource>
  );
}
