import fs from "fs";
import path from "path";
import { ChromaClient } from "chromadb";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- LOAD DATA ----------------
console.log("Loading chunks and embeddings...");

const chunks = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../stage2_chunks/chunks.json"),
    "utf8"
  )
);

const embeddings = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../stage3_embeddings2/embeddings_v2.json"),
    "utf8"
  )
);

if (chunks.length !== embeddings.length) {
  console.error("Error: chunks != embeddings");
  process.exit(1);
}

console.log(`Loaded ${embeddings.length} items.`);

// ---------------- CONNECT ----------------
const client = new ChromaClient({
  path: "http://localhost:8000"
});

const COLLECTION = "rag_academic_docs";

const collection = await client.getOrCreateCollection({
  name: COLLECTION
});

console.log("Collection ready. Uploading...\n");

// ---------------- UPLOAD ----------------

// ✅ FIXED: smaller batch size
const BATCH_SIZE = 50;

for (let i = 0; i < embeddings.length; i += BATCH_SIZE) {
  const batch = embeddings.slice(i, i + BATCH_SIZE);

  const ids = batch.map(b => b.id);
  const texts = batch.map(b => b.text);

  const metas = batch.map(b => ({
    source_page: b.source || "",
    source_file: b.source || "",
    semester: b.semester || "",
    pdf_url: b.pdf_url || ""
  }));

  const vectors = batch.map(b => b.embedding);

  console.log(`Uploading batch ${i} → ${i + batch.length}`);

  try {
    await collection.add({
      ids,
      documents: texts,
      metadatas: metas,
      embeddings: vectors
    });
  } catch (err) {
    console.error("❌ UPLOAD FAILED AT BATCH:", i);
    console.error(err.message || err);
    process.exit(1); // stop immediately if failure
  }
}

console.log("\nUpload complete!");