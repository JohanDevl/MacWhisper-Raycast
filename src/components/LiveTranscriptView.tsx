import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { basename } from "node:path";
import { errorMessage, StreamHandle, streamTranscription } from "../lib/mw";
import { TranscriptDetail } from "./TranscriptDetail";

type Status = "running" | "done" | "failed" | "stopped";

export function LiveTranscriptView({ path }: { path: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("running");
  const [failure, setFailure] = useState<string>();
  const handle = useRef<StreamHandle | null>(null);

  useEffect(() => {
    let active = true;
    try {
      handle.current = streamTranscription(path, {}, (current) => {
        if (active) setText(current);
      });
    } catch (error) {
      setStatus("failed");
      setFailure(errorMessage(error));
      return;
    }
    handle.current.done
      .then((transcript) => {
        if (!active) return;
        setText(transcript);
        setStatus("done");
        showToast({ style: Toast.Style.Success, title: "Transcription complete" });
      })
      .catch((error) => {
        if (!active) return;
        setStatus((current) => (current === "stopped" ? current : "failed"));
        setFailure(errorMessage(error));
      });
    return () => {
      active = false;
      handle.current?.cancel();
    };
  }, [path]);

  function stop() {
    setStatus("stopped");
    handle.current?.cancel();
  }

  if (status === "done") {
    return <TranscriptDetail results={[{ path, transcript: text }]} format="txt" />;
  }

  const banner =
    status === "running"
      ? "_Transcribing live: segments appear as MacWhisper finalizes them._"
      : status === "stopped"
        ? "_Stopped. The transcript below is partial._"
        : `**Transcription failed:** ${failure ?? "unknown error"}`;

  return (
    <Detail
      isLoading={status === "running"}
      navigationTitle={basename(path)}
      markdown={`${banner}\n\n${text}`}
      actions={
        <ActionPanel>
          {status === "running" && <Action title="Stop Transcription" icon={Icon.Stop} onAction={stop} />}
          <Action.CopyToClipboard title="Copy Partial Transcript" content={text} />
        </ActionPanel>
      }
    />
  );
}
