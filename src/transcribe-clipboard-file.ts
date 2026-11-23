import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { basename } from "node:path";
import { clipboardFile, isMediaFile } from "./lib/files";
import { errorMessage, transcribeFile } from "./lib/mw";

export default async function Command() {
  const file = await clipboardFile();
  if (!file) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No file in the clipboard",
      message: "Copy an audio or video file (⌘C in Finder) first.",
    });
    return;
  }
  if (!isMediaFile(file)) {
    await showToast({ style: Toast.Style.Failure, title: "Not an audio or video file", message: basename(file) });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Transcribing…", message: basename(file) });
  try {
    const transcript = await transcribeFile(file);
    await Clipboard.copy(transcript);
    await showHUD("Transcript copied to clipboard");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Transcription failed";
    toast.message = errorMessage(error);
  }
}
