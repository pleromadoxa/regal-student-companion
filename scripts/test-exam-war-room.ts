/**
 * End-to-end validation for Exam War Room catalog and prompt pipeline.
 * Run: npm run test:exam-war-room
 */
import assert from "node:assert/strict";
import {
  EXAM_SYSTEMS,
  EXAM_REGIONS,
  getExamSystemsByRegion,
  buildExamSystemContext,
} from "../src/lib/exam-systems";
import {
  WAR_ROOM_MODULES,
  buildModulePrompt,
  parseBriefingFromText,
  serializeBriefingForApi,
  moduleSystemRole,
} from "../src/lib/exam-war-room";
import { REGAL_AI_ACTIONS } from "../src/lib/regal-ai";

function main() {
  console.log("Exam War Room — end-to-end self-test\n");

  assert.ok(EXAM_SYSTEMS.length >= 25, "Expected 25+ exam systems");
  assert.equal(EXAM_REGIONS.length, 5, "Expected 5 regions");

  const westAfrica = getExamSystemsByRegion("west_africa");
  assert.ok(westAfrica.some((e) => e.id === "wassce"), "WASSCE missing");
  assert.ok(westAfrica.some((e) => e.id === "bece"), "BECE missing");
  assert.ok(westAfrica.some((e) => e.id === "jamb-utme"), "JAMB missing");

  const africa = getExamSystemsByRegion("africa");
  assert.ok(africa.some((e) => e.id === "kcse"), "KCSE missing");
  assert.ok(africa.some((e) => e.id === "nsc-matric"), "Matric missing");

  const intl = getExamSystemsByRegion("international");
  assert.ok(intl.some((e) => e.id === "sat"), "SAT missing");
  assert.ok(intl.some((e) => e.id === "ielts"), "IELTS missing");
  assert.ok(intl.some((e) => e.id === "gcse"), "GCSE missing");

  console.log(`✓ ${EXAM_SYSTEMS.length} exam systems across ${EXAM_REGIONS.length} regions`);

  const briefing = {
    examSystemId: "wassce",
    title: "WASSCE Core Mathematics",
    subject: "Core Mathematics",
    examDate: "2026-08-15",
    weakAreas: "Trigonometry, word problems",
    notes: "Paper 2 theory focus",
    hoursPerDay: 4,
    targetGrade: "A1",
    paperNumber: "Paper 2",
  };

  const serialized = serializeBriefingForApi(briefing, 14);
  assert.ok(serialized.includes("examSystemId: wassce"));
  assert.ok(serialized.includes("WASSCE"));

  const parsed = parseBriefingFromText(serialized, "fallback", "topic");
  assert.equal(parsed.examSystemId, "wassce");
  assert.equal(parsed.title, "WASSCE Core Mathematics");
  assert.equal(parsed.hoursPerDay, 4);
  console.log("✓ Briefing serialize/parse round-trip");

  assert.equal(WAR_ROOM_MODULES.length, 6, "Expected 6 war room modules");

  for (const mod of WAR_ROOM_MODULES) {
    const prompt = buildModulePrompt(mod.id, briefing, 14);
    assert.ok(prompt.length > 200, `${mod.id} prompt too short`);
    assert.ok(
      prompt.includes("WASSCE") || prompt.includes("Core Mathematics"),
      `${mod.id} missing context`
    );
    assert.ok(moduleSystemRole(mod.id).length > 10, `${mod.id} missing system role`);
  }
  console.log("✓ All 6 module prompts generated with exam context");

  const ctx = buildExamSystemContext("jamb-utme", "Use of English");
  assert.ok(ctx.includes("JAMB"));
  assert.ok(ctx.includes("Nigeria"));
  console.log("✓ Regional exam context builder");

  assert.ok(REGAL_AI_ACTIONS.exam_war_module, "exam_war_module action missing");
  assert.ok(REGAL_AI_ACTIONS.exam_war_plan, "exam_war_plan action missing");
  console.log("✓ Regal AI actions registered");

  console.log("\nAll Exam War Room tests passed.");
}

main();
