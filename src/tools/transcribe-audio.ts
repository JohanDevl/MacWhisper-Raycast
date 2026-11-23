import { getSelectedFinderItems, Tool } from "@raycast/api";
import { existsSync, statSync } from "node:fs";
import { basename } from "node:path";
import { expandHome, OUTPUT_FORMATS, OutputFormat, transcribeFile, transcribeFileTo } from "../lib/mw";

const MAX_TRANSCRIPT_CHARS = 200_000;

type Input = {
  /**
   * Absolute path (or path starting with `~`) of the audio or video file to transcribe.
   * Leave empty to transcribe the files currently selected in Finder.
   */
  path?: string;
  /** ISO 639-1 language code of the spoken audio (e.g. `en`, `fr`, `de`) or `auto`. Leave empty to use the user's default. */
  language?: string;
  /** Output format: one of txt, srt, vtt, json, csv, md, html, avid. Use srt or vtt for subtitles. Defaults to txt. */
  format?: string;
  /** Model id in `engine:model-id` form, exactly as returned by the list-models tool. Leave empty to use the active model. */
  model?: string;
  /** Whether to prefix each segment with a timestamp (text formats only). */
  timestamps?: boolean;
  /** Whether to detect and label the different speakers. */
  speakers?: boolean;
  /**
   * Absolute path of a file to write the transcript to, only when the user explicitly asks to save it.
   * Only valid when transcribing a single file.
   */
  outputPath?: string;
};

function normalizeFormat(format?: string): OutputFormat {
  const candidate = format?.toLowerCase().replace(/^\./, "");
  return OUTPUT_FORMATS.find((value) => value === candidate) ?? "txt";
}

async function resolveTargets(path?: string): Promise<string[]> {
  if (path?.trim()) return [expandHome(path.trim())];
  try {
    const items = await getSelectedFinderItems();
    return items.map((item) => item.path).filter((item) => statSync(item).isFile());
  } catch {
    return [];
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.outputPath) return undefined;
  const target = expandHome(input.outputPath);
  if (!existsSync(target)) return undefined;
  return {
    message: "A file already exists at the output path. Overwrite it with the transcript?",
    info: [
      { name: "Source", value: input.path },
      { name: "Output", value: target },
    ],
  };
};

/**
 * Transcribes an audio or video file with MacWhisper (fully on-device with local models) and returns the transcript.
 */
export default async function tool(input: Input) {
  const targets = await resolveTargets(input.path);
  if (targets.length === 0) {
    return "No file to transcribe: no path was given and nothing is selected in Finder.";
  }
  const folder = targets.find((target) => existsSync(target) && statSync(target).isDirectory());
  if (folder) {
    return `${folder} is a folder. Ask for a specific audio or video file, or use the Batch Transcribe Folder command.`;
  }

  const format = normalizeFormat(input.format);
  const options = {
    format,
    language: input.language,
    model: input.model,
    timestamps: input.timestamps,
    speakers: input.speakers,
  };

  if (input.outputPath) {
    if (targets.length > 1) return "outputPath can only be used when transcribing a single file.";
    const output = expandHome(input.outputPath);
    await transcribeFileTo(targets[0], output, { ...options, overwrite: true });
    return `Transcript of ${basename(targets[0])} saved to ${output} (${format}).`;
  }

  const transcripts: { file: string; transcript: string }[] = [];
  for (const target of targets) {
    const transcript = await transcribeFile(target, options);
    transcripts.push({
      file: target,
      transcript:
        transcript.length > MAX_TRANSCRIPT_CHARS
          ? `${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}\n[Transcript truncated: ${transcript.length} characters in total]`
          : transcript,
    });
  }
  return { format, transcripts };
}
