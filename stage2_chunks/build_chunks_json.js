import fs from "fs";
import path from "path";

const semFiles = [
  "sem1_chunks.jsonl",
  "sem2_chunks.jsonl",
  "sem3_chunks.jsonl",
];

const inputDir = path.join("stage2_chunks");
const outPath = path.join("stage2_chunks", "chunks.json");

let all = [];

for (const f of semFiles) {
  const full = path.join(inputDir, f);

  if (!fs.existsSync(full)) {
    console.log("Missing:", full);
    continue;
  }

  const lines = fs.readFileSync(full, "utf8")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  for (const line of lines) {
    const obj = JSON.parse(line);

    // Convert to OLD format your scripts expect
    all.push({
      id: obj.id,
      content: obj.text,
      source: obj.source_page,
      chunk_id: obj.id,
      doc_index: all.length
    });
  }

  console.log("Loaded:", f, "lines:", lines.length);
}

fs.writeFileSync(outPath, JSON.stringify(all, null, 2));
console.log("\n✅ chunks.json created:", outPath);
console.log("Total chunks:", all.length);
