import { FileSource } from "./components/FileSource";
import { LiveTranscriptView } from "./components/LiveTranscriptView";

export default function Command() {
  return (
    <FileSource actionTitle="Start Live Transcript" allowMultiple={false}>
      {(paths) => <LiveTranscriptView path={paths[0]} />}
    </FileSource>
  );
}
