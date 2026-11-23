# MacWhisper for Raycast

Transcribe audio and video files on-device with [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) straight from Raycast, manage your transcription models, and let Raycast AI transcribe for you.

The extension is a thin wrapper around the `mw` command-line tool that ships with MacWhisper (15.11+).

## Requirements

- macOS
- MacWhisper 15.11 or later, with at least one downloaded model
- The `mw` CLI, found automatically at `/usr/local/bin/mw` or inside `MacWhisper.app` (override it in the preferences)

## Commands

| Command | Description |
| --- | --- |
| **Transcribe File** | Pick one or more files, choose model, language, format (txt, srt, vtt, json, csv, md, html, avid), speaker detection and timestamps, then copy, paste or save the transcript. |
| **Transcribe Finder Selection** | Transcribe the files selected in Finder and copy the transcript to the clipboard. |
| **Batch Transcribe Folder** | Transcribe every audio/video file of a folder (optionally recursive) into transcript or subtitle files. |
| **Manage Models** | List downloaded models, see the active one and switch models. |

## Raycast AI

Mention `@macwhisper` in Raycast AI:

- `@macwhisper transcribe ~/Downloads/interview.m4a`
- `@macwhisper summarize the recording I selected in Finder`
- `@macwhisper make French subtitles for ~/Movies/clip.mp4 and save them next to it`
- `@macwhisper which models do I have? Switch to Whisper Large v3 Turbo`

| Tool | Description |
| --- | --- |
| `transcribe-audio` | Transcribe a file (or the Finder selection) and return the transcript, optionally writing it to a file. Asks before overwriting. |
| `list-models` | List downloaded models, the active model and the MacWhisper version. |
| `select-model` | Change the active model. Asks for confirmation. |

## Preferences

- **mw CLI Path**: custom path to `mw`.
- **Default Language**: ISO 639-1 code or `auto`; empty uses MacWhisper's setting.
- **History**: also save transcriptions to MacWhisper's history (`--persist`).

## Development

```bash
npm install
npm run dev
```
