import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const MACWHISPER_BUNDLE_ID = "com.goodsnooze.MacWhisper";

const CANDIDATE_BINARIES = ["/usr/local/bin/mw", "/Applications/MacWhisper.app/Contents/MacOS/mw"];

const MAX_BUFFER = 100 * 1024 * 1024;

export const OUTPUT_FORMATS = ["txt", "srt", "vtt", "json", "csv", "md", "html", "avid"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export type TranscribeOptions = {
  /** Model in `engine:model-id` form. Empty means the app's current model. */
  model?: string;
  /** ISO 639-1 code or `auto`. Empty means the app's current language. */
  language?: string;
  format?: OutputFormat;
  /** Undefined keeps the app's setting. */
  speakers?: boolean;
  /** Undefined keeps the style's setting. */
  timestamps?: boolean;
  persist?: boolean;
};

export type BatchOptions = TranscribeOptions & {
  outputDir: string;
  recursive?: boolean;
  overwrite?: boolean;
};

export type Model = {
  id: string;
  name: string;
  size: string;
  active: boolean;
};

export class MacWhisperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MacWhisperError";
  }
}

export function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return `${homedir()}${path.slice(1)}`;
  return path;
}

export function resolveBinary(): string {
  const { mwPath } = getPreferenceValues<Preferences>();
  const custom = mwPath?.trim();
  if (custom) {
    const expanded = expandHome(custom);
    if (existsSync(expanded)) return expanded;
    throw new MacWhisperError(`The mw CLI was not found at "${custom}". Check the extension preferences.`);
  }
  const found = CANDIDATE_BINARIES.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new MacWhisperError("MacWhisper is not installed. Install MacWhisper 15.11 or later to get the mw CLI.");
  }
  return found;
}

function extractErrorMessage(error: unknown): string {
  const stderr = (error as { stderr?: string }).stderr ?? "";
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const errorLine = lines.find((line) => line.startsWith("Error:"));
  if (errorLine) return errorLine.replace(/^Error:\s*/, "");
  if (lines.length > 0) return lines[lines.length - 1];
  return error instanceof Error ? error.message : String(error);
}

async function runMw(args: string[]): Promise<string> {
  const binary = resolveBinary();
  try {
    const { stdout } = await execFileAsync(binary, args, { maxBuffer: MAX_BUFFER });
    return stdout;
  } catch (error) {
    throw new MacWhisperError(extractErrorMessage(error));
  }
}

function transcribeArgs(options: TranscribeOptions): string[] {
  const { defaultLanguage, saveToHistory } = getPreferenceValues<Preferences>();
  const args: string[] = [];
  const model = options.model?.trim();
  const language = (options.language?.trim() || defaultLanguage)?.trim();
  if (model) args.push("--model", model);
  if (language) args.push("--language", language);
  if (options.format) args.push("--format", options.format);
  if (options.speakers !== undefined) args.push(options.speakers ? "--speakers" : "--no-speakers");
  if (options.timestamps !== undefined) args.push(options.timestamps ? "--timestamps" : "--no-timestamps");
  if (options.persist ?? saveToHistory) args.push("--persist");
  return args;
}

/** Transcribes a single file and returns the transcript in the requested format. */
export async function transcribeFile(path: string, options: TranscribeOptions = {}): Promise<string> {
  const stdout = await runMw(["transcribe", ...transcribeArgs(options), "--", expandHome(path)]);
  return stdout.trimEnd();
}

/** Transcribes a single file straight to `outputPath`. */
export async function transcribeFileTo(
  path: string,
  outputPath: string,
  options: TranscribeOptions & { overwrite?: boolean } = {},
): Promise<void> {
  const args = ["transcribe", ...transcribeArgs(options), "--output", expandHome(outputPath)];
  if (options.overwrite) args.push("--overwrite");
  await runMw([...args, "--", expandHome(path)]);
}

/** Transcribes every media file in a directory into `outputDir`. Returns the written file paths. */
export async function transcribeDirectory(directory: string, options: BatchOptions): Promise<string[]> {
  const args = ["transcribe", ...transcribeArgs(options), "--output-dir", expandHome(options.outputDir)];
  if (options.recursive) args.push("--recursive");
  if (options.overwrite) args.push("--overwrite");
  const binary = resolveBinary();
  try {
    const { stdout, stderr } = await execFileAsync(binary, [...args, "--", expandHome(directory)], {
      maxBuffer: MAX_BUFFER,
    });
    return `${stdout}\n${stderr}`
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("Wrote "))
      .map((line) => line.slice("Wrote ".length));
  } catch (error) {
    throw new MacWhisperError(extractErrorMessage(error));
  }
}

/**
 * Parses the table printed by `mw models list`, e.g.
 * `▸ parakeet-pro:nvidia_parakeet-v3  Parakeet v3  1,24 GB`.
 */
export function parseModels(output: string): Model[] {
  const models: Model[] = [];
  for (const rawLine of output.split("\n")) {
    const active = rawLine.trimStart().startsWith("▸");
    const tokens = rawLine.replace("▸", " ").trim().split(/\s+/).filter(Boolean);
    const idIndex = tokens.findIndex((token) => token.includes(":"));
    if (idIndex !== 0 || tokens.length < 4) continue;
    const id = tokens[0];
    const size = tokens.slice(-2).join(" ");
    const name = tokens.slice(1, -2).join(" ");
    models.push({ id, name, size, active });
  }
  return models;
}

export async function listModels(): Promise<Model[]> {
  return parseModels(await runMw(["models", "list"]));
}

export async function selectModel(modelId: string): Promise<void> {
  await runMw(["models", "select", modelId]);
}

export async function getVersion(): Promise<string> {
  return (await runMw(["version"])).trim();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
