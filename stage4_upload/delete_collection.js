import { ChromaClient } from "chromadb";

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const COLLECTION = "rag_academic_docs";

async function main() {
  try {
    console.log("Connecting to Chroma:", CHROMA_URL);

    const client = new ChromaClient({ path: CHROMA_URL });

    console.log("Deleting collection:", COLLECTION);
    await client.deleteCollection({ name: COLLECTION });

    console.log("✅ Collection deleted successfully.");
  } catch (err) {
    console.log("⚠️ Collection not found or already deleted.");
    console.log("Reason:", err.message);
  }
}

main();
