import test from "node:test";
import assert from "node:assert/strict";

import { formatDateForSpeech } from "../lib/formatters.ts";

test("formatDateForSpeech formats ISO date for Korean TTS", () => {
  assert.equal(formatDateForSpeech("2026-06-17"), "2026년 6월 17일");
});

test("formatDateForSpeech leaves unknown text unchanged", () => {
  assert.equal(formatDateForSpeech("unknown"), "unknown");
});
