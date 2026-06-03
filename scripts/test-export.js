#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

console.log("🧪 Running Markdown Export & QuickCapture Removal Verification Tests...\n");

let failures = 0;

// 1. Check file existence of the new modules
const newFiles = [
  "lib/export/utils.ts",
  "lib/export/compile-pillar.ts",
  "lib/export/compile-product.ts",
  "lib/export/compile-research.ts",
  "app/api/export/md/route.ts",
  "components/ExportMarkdownButton.tsx"
];

console.log("Checking file existence for new components...");
for (const file of newFiles) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file} exists.`);
  } else {
    console.log(`  ❌ ${file} is missing!`);
    failures++;
  }
}
console.log("");

// 2. Check that FloatingQuickCapture.tsx was deleted
console.log("Checking if FloatingQuickCapture.tsx was deleted...");
const quickCapturePath = path.join(ROOT, "components/FloatingQuickCapture.tsx");
if (!fs.existsSync(quickCapturePath)) {
  console.log("  ✅ components/FloatingQuickCapture.tsx was successfully deleted.");
} else {
  console.log("  ❌ components/FloatingQuickCapture.tsx still exists in the workspace!");
  failures++;
}
console.log("");

// 3. Verify no lingering references to FloatingQuickCapture in app/layout.tsx
console.log("Verifying app/layout.tsx has no FloatingQuickCapture import or tag...");
const layoutPath = path.join(ROOT, "app/layout.tsx");
if (fs.existsSync(layoutPath)) {
  const content = fs.readFileSync(layoutPath, "utf8");
  if (content.includes("FloatingQuickCapture")) {
    console.log("  ❌ app/layout.tsx still references FloatingQuickCapture!");
    failures++;
  } else {
    console.log("  ✅ app/layout.tsx references to FloatingQuickCapture are removed.");
  }
} else {
  console.log("  ❌ app/layout.tsx is missing!");
  failures++;
}
console.log("");

// 4. Summarize
if (failures > 0) {
  console.log(`❌ Verification failed with ${failures} error(s).\n`);
  process.exit(1);
} else {
  console.log("🎉 All verification checks passed successfully!\n");
  process.exit(0);
}
