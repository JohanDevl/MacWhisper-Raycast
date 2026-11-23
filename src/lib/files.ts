import { Clipboard, getSelectedFinderItems } from "@raycast/api";
import { statSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expandHome, OutputFormat } from "./mw";

export const MEDIA_EXTENSIONS = new Set([
  ".m4a",
  ".mp3",
  ".wav",
  ".aac",
  ".flac",
  ".ogg",
  ".opus",
  ".aif",
  ".aiff",
  ".caf",
  ".wma",
  ".mp4",
  ".mov",
  ".m4v",
  ".mkv",
  ".webm",
  ".avi",
  ".wmv",
  ".mpg",
  ".mpeg",
  ".mpga",
  ".m4b",
  ".3gp",
  ".amr",
  ".mts",
]);

export const DEFAULT_RECORDING_FOLDERS = "~/Downloads, ~/Desktop, ~/Movies, ~/Documents/Zoom";

const SCAN_DEPTH = 2;

export function isMediaFile(path: string): boolean {
  return MEDIA_EXTENSIONS.has(extname(path).toLowerCase());
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Audio/video files currently selected in Finder; empty when Finder is not frontmost. */
export async function selectedFinderFiles(): Promise<string[]> {
  try {
    const items = await getSelectedFinderItems();
    return items.map((item) => item.path).filter((path) => isFile(path) && isMediaFile(path));
  } catch {
    return [];
  }
}

/** The file copied to the clipboard (e.g. ⌘C in Finder), if any. */
export async function clipboardFile(): Promise<string | undefined> {
  const { file } = await Clipboard.read();
  if (!file) return undefined;
  const path = file.startsWith("file://") ? fileURLToPath(file) : file;
  return isFile(path) ? path : undefined;
}

/** `<dir>/<name>.<format>` next to the source file. */
export function sidecarPath(path: string, format: OutputFormat): string {
  return join(dirname(path), `${basename(path, extname(path))}.${format}`);
}

export type Recording = {
  path: string;
  name: string;
  folder: string;
  modifiedAt: Date;
  sizeBytes: number;
};

export function parseFolders(value: string | undefined): string[] {
  return (value?.trim() ? value : DEFAULT_RECORDING_FOLDERS)
    .split(",")
    .map((folder) => folder.trim())
    .filter(Boolean)
    .map(expandHome);
}

async function collectMedia(folder: string, depth: number, into: Recording[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(folder, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      if (depth > 0 && !entry.name.endsWith(".app")) await collectMedia(path, depth - 1, into);
    } else if (entry.isFile() && isMediaFile(entry.name)) {
      try {
        const info = await stat(path);
        into.push({ path, name: entry.name, folder, modifiedAt: info.mtime, sizeBytes: info.size });
      } catch {
        // File vanished between readdir and stat.
      }
    }
  }
}

/** Most recently modified audio/video files across the given folders, newest first. */
export async function recentRecordings(folders: string[], limit = 20): Promise<Recording[]> {
  const found: Recording[] = [];
  for (const folder of folders) await collectMedia(folder, SCAN_DEPTH, found);
  return found.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime()).slice(0, limit);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
