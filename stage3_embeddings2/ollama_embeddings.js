import fs from "fs";
import path from "path";

const CHUNKS_PATH = path.join("../stage2_chunks", "chunks.json");

// ✅ FIXED OUTPUT PATH (save in current folder)
const OUT_PATH = path.join("embeddings_v2.json");

const OLLAMA_URL = "http://localhost:11434/api/embeddings";
const MODEL = "nomic-embed-text";

console.log("Loading chunks.json...");
const chunks = JSON.parse(fs.readFileSync(CHUNKS_PATH, "utf8"));
console.log("Chunks:", chunks.length);

async function embed(text) {
  const r = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt: text
    })
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(err);
  }

  const data = await r.json();
  return data.embedding;
}

let finalData = [];

for (let i = 0; i < chunks.length; i++) {
  const c = chunks[i];

  const vector = await embed(c.content);

  finalData.push({
    id: c.id,
    text: c.content,
    source: c.source,
    pdf: c.source,
    pdf_url: `/pdf/${c.source}`,
    module: "",
    embedding: vector
  });

  if (i % 50 === 0) {
    console.log(`Progress: ${i}/${chunks.length}`);
  }
}

// ✅ SAVES IN stage3_embeddings2 FOLDER
fs.writeFileSync(OUT_PATH, JSON.stringify(finalData, null, 2));

console.log("\n✅ Saved embeddings:", OUT_PATH);