export const AI_TASKS = {
  summary: {
    title: "Summary",
    prompt:
      "Write a concise summary of this recording: a one-sentence overview, then the main points as a bulleted list.",
  },
  "key-points": {
    title: "Key Points & Decisions",
    prompt:
      "List the key points, decisions made and open questions from this recording, each under its own heading. Skip any heading with nothing to report.",
  },
  "action-items": {
    title: "Action Items",
    prompt:
      "Extract every action item from this recording as a Markdown checklist. Include the owner and the due date when they are mentioned.",
  },
  translate: {
    title: "Translate",
    prompt: "Translate this transcript into {language}. Keep the meaning and tone, and keep paragraph breaks.",
  },
  "follow-up-email": {
    title: "Follow-up Email",
    prompt:
      "Draft a short, friendly follow-up email based on this recording: thank the participants, recap the decisions and list the next steps.",
  },
  custom: {
    title: "Custom Prompt",
    prompt: "",
  },
} as const;

export type AITaskId = keyof typeof AI_TASKS;

/** Keeps the prompt within what Raycast AI models accept comfortably. */
const MAX_TRANSCRIPT_CHARS = 120_000;

export function buildPrompt(task: AITaskId, transcript: string, extra: { language?: string; custom?: string }): string {
  const instruction =
    task === "custom"
      ? extra.custom?.trim() || AI_TASKS.summary.prompt
      : AI_TASKS[task].prompt.replace("{language}", extra.language?.trim() || "English");
  const body =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? `${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}\n[Transcript truncated]`
      : transcript;
  return `${instruction}\nAnswer in Markdown. Answer in the language of the transcript unless asked otherwise.\n\nTranscript:\n"""\n${body}\n"""`;
}
