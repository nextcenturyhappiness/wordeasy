#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

import {
  DEACTIVATED_MEDICAL_CARD_KEYS,
  addStableIdentity
} from "./lib/content-contract.mjs";
import {
  MEDICAL_MORPHOLOGY_CARDS,
  MEDICAL_REPLACEMENT_CARDS
} from "./lib/medical-reshape-cards.mjs";
import { formatIssues, validateDataset } from "./lib/content-validator.mjs";

const seedUrl = new URL("../data/seed-data.json", import.meta.url);

function completeCard(draft) {
  return addStableIdentity({
    ...draft,
    source_type: "original_example",
    source_title: null,
    source_url: null,
    doi: null,
    pmid: null,
    card_type: "context_recall",
    active: true
  });
}

const dataset = JSON.parse(await readFile(seedUrl, "utf8"));
const knownKeys = new Set(dataset.cards.map((card) => card.card_key));

for (const card of dataset.cards) {
  if (DEACTIVATED_MEDICAL_CARD_KEYS.includes(card.card_key)) {
    card.active = false;
  }
}

const additions = [...MEDICAL_REPLACEMENT_CARDS, ...MEDICAL_MORPHOLOGY_CARDS].map(completeCard);
for (const card of additions) {
  if (knownKeys.has(card.card_key)) {
    throw new Error(`Refusing to reuse existing card_key ${card.card_key}.`);
  }
  knownKeys.add(card.card_key);
  dataset.cards.push(card);
}

const validation = validateDataset(dataset);
if (validation.errors.length > 0) {
  throw new Error(`Reshape validation failed:\n${formatIssues(validation.errors)}`);
}

await writeFile(seedUrl, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
console.log(
  `Updated seed: ${String(dataset.cards.length)} cards (${String(validation.counts.medical)} active Medical categories).`
);
