#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import {
  formatIssues,
  validateDataset,
  validateEssentialDataset,
  validateImportTemplate
} from "./lib/content-validator.mjs";

const seedUrl = new URL("../data/seed-data.json", import.meta.url);
const essentialUrl = new URL("../data/essential-medical/cards.json", import.meta.url);
const templateUrl = new URL("../data/import-template.csv", import.meta.url);

let dataset;
try {
  dataset = JSON.parse(await readFile(seedUrl, "utf8"));
} catch (error) {
  console.error(
    `[seed_read] data/seed-data.json: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
}

if (dataset) {
  const result = validateDataset(dataset);
  let templateErrors;
  try {
    const template = await readFile(templateUrl, "utf8");
    templateErrors = validateImportTemplate(template, dataset.cards[0]);
  } catch (error) {
    templateErrors = [
      {
        cardId: "import-template",
        cardKey: null,
        code: "csv_read",
        message: error instanceof Error ? error.message : String(error)
      }
    ];
  }

  const errors = [...result.errors, ...templateErrors];
  if (errors.length > 0) {
    console.error(formatIssues(errors));
    console.error(`Content validation failed with ${errors.length} error(s).`);
    process.exitCode = 1;
  } else {
    console.log(
      `Content validation passed: total=${result.counts.total}, research=${result.counts.research}, medical=${result.counts.medical}.`
    );
    console.log(`Research categories: ${JSON.stringify(result.counts.researchCategories)}.`);
    console.log(`Medical categories: ${JSON.stringify(result.counts.medicalCategories)}.`);
    console.log(
      `Source audit: ${result.counts.total} original examples with null citation metadata.`
    );
  }
}

let essentialDataset;
try {
  essentialDataset = JSON.parse(await readFile(essentialUrl, "utf8"));
} catch (error) {
  console.error(
    `[seed_read] data/essential-medical/cards.json: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
}

if (essentialDataset) {
  const essentialResult = validateEssentialDataset(essentialDataset);
  if (essentialResult.errors.length > 0) {
    console.error(formatIssues(essentialResult.errors));
    console.error(
      `Essential medical validation failed with ${essentialResult.errors.length} error(s).`
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Essential medical validation passed: total=${String(essentialResult.counts.essential)}.`
    );
  }
}
