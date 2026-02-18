import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ChromaClient } from "chromadb";
import OpenAI from "openai";
import fetch from "node-fetch";
import stringSimilarity from "string-similarity";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ---------------------------------------------------------
// ENV CHECK
// ---------------------------------------------------------
if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY missing in .env");
  process.exit(1);
}
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
// ---------------------------------------------------------
// FILE INDEX
// ---------------------------------------------------------
let fileIndex = {};
try {
  fileIndex = JSON.parse(
    fs.readFileSync(path.join(__dirname, "file_index.json"), "utf8")
  );
  console.log("file_index.json loaded.");
} catch {
  console.log("file_index.json not found.");
}
// ---------------------------------------------------------
// SUBJECT MAP
// ---------------------------------------------------------
const SUBJECT_MAP = {
  os: {
    keywords: ["os", "operating system", "deadlock", "scheduling", "paging"],
    youtubeKeywords: {
      general: "operating systems tutorial",
      deadlock: "deadlock in operating systems",
      scheduling: "CPU scheduling algorithms",
      paging: "paging in OS memory management",
      synchronization: "process synchronization"
    },
    modules: {
      1: ["system structure", "os structure", "system calls", "os services"],
      2: ["process scheduling", "threads", "multithreading"],
      3: ["synchronization", "semaphore", "deadlock", "critical section"],
      4: ["memory management", "paging", "segmentation", "thrashing"],
      5: ["file system", "directory", "disk scheduling", "protection"]
    }
  },

  dsa: {
    keywords: ["dsa", "data structures", "stack", "queue", "trees", "graphs"],
    youtubeKeywords: {
      general: "data structures and algorithms",
      stack: "stack data structure tutorial",
      queue: "queue data structure",
      trees: "binary tree tutorial",
      graphs: "graph algorithms tutorial",
      "linked list": "linked list implementation"
    },
    modules: {
      1: ["arrays", "stacks", "postfix", "prefix", "polish notation"],
      2: ["queues", "circular queue", "priority queue", "recursion"],
      3: ["linked list", "dll", "sll", "circular linked", "garbage collection"],
      4: ["trees", "binary tree", "tree traversal", "bst"],
      5: ["graphs", "bfs", "dfs", "hashing", "collision", "rehashing"]
    }
  },

  ddco: {
    keywords: ["ddco", "digital logic", "logic gates", "microprocessor"],
    youtubeKeywords: {
      general: "digital design and computer organization",
      "logic gates": "logic gates tutorial",
      "boolean algebra": "boolean algebra simplification",
      "flip flop": "flip flops in digital electronics",
      microprocessor: "8086 microprocessor tutorial"
    },
    modules: {
      1: ["boolean algebra", "kmap", "nand", "nor", "verilog"],
      2: ["adder", "subtractor", "encoder", "decoder", "multiplexer", "flip flop"],
      3: ["processor", "instruction", "addressing modes"],
      4: ["io devices", "interrupts", "dma", "cache memory"],
      5: ["pipeline", "alu", "register transfer"]
    }
  },

  maths: {
    keywords: ["math", "mathematics", "probability", "statistics", "regression"],
    youtubeKeywords: {
      general: "probability and statistics",
      probability: "probability distribution tutorial",
      regression: "linear regression explained",
      "hypothesis testing": "hypothesis testing statistics",
      "chi square": "chi square test tutorial"
    },
    modules: {
      1: ["probability distribution", "random variable", "binomial", "poisson"],
      2: ["joint probability", "markov chain"],
      3: ["sampling", "standard error", "hypothesis testing"],
      4: ["t test", "chi square", "f distribution"],
      5: ["correlation", "regression", "least squares"]
    }
  }
};

// ---------------------------------------------------------
// SMART QUERY PARSERS
// ---------------------------------------------------------
function extractModule(q) {
  const m = q.match(/module\s*[-_ ]*(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

function extractSem(q) {
  const s = q.match(/(\d+)\s*(st|nd|rd|th)?\s*sem/i);
  return s ? parseInt(s[1]) : null;
}

function extractSubject(q) {
  q = q.toLowerCase();
  for (const [subj, data] of Object.entries(SUBJECT_MAP)) {
    if (data.keywords.some(k => q.includes(k))) return subj;
  }
  return null;
}

function extractTopic(query, subject) {
  if (!subject) return null;

  const q = query.toLowerCase();
  const subjectData = SUBJECT_MAP[subject];

  for (const topic of Object.keys(subjectData.youtubeKeywords)) {
    if (topic !== "general" && q.includes(topic.toLowerCase())) return topic;
  }

  for (const moduleTopics of Object.values(subjectData.modules)) {
    for (const topic of moduleTopics) {
      if (q.includes(topic.toLowerCase())) return topic;
    }
  }

  return null;
}

// ---------------------------------------------------------
// YOUTUBE LINKS
// ---------------------------------------------------------
function generateYouTubeSearchQuery(query, subject, topic) {
  if (!subject) {
    return query.replace(/give|show|explain|what is|notes on/gi, "").trim() + " tutorial";
  }

  const subjectData = SUBJECT_MAP[subject];

  if (topic && subjectData.youtubeKeywords[topic]) {
    return subjectData.youtubeKeywords[topic];
  }

  let base = subjectData.youtubeKeywords.general || query;
  if (topic) base += ` ${topic}`;
  return base;
}

function generateYouTubeLinks(query, subject, topic, count = 3) {
  const searchQuery = generateYouTubeSearchQuery(query, subject, topic);
  const encodedQuery = encodeURIComponent(searchQuery);

  const links = [
    {
      type: "search",
      url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
      description: `Search: ${searchQuery}`
    }
  ];

  const channelRecommendations = {
    os: [
      { name: "Neso Academy", query: encodedQuery + "+neso+academy" },
      { name: "Gate Smashers", query: encodedQuery + "+gate+smashers" }
    ],
    dsa: [
      { name: "Abdul Bari", query: encodedQuery + "+abdul+bari" },
      { name: "Apna College", query: encodedQuery + "+apna+college" }
    ],
    ddco: [
      { name: "Neso Academy", query: encodedQuery + "+neso+academy" },
      { name: "Tutorials Point", query: encodedQuery + "+tutorials+point" }
    ],
    maths: [
      { name: "Khan Academy", query: encodedQuery + "+khan+academy" },
      { name: "StatQuest", query: encodedQuery + "+statquest" }
    ]
  };

  if (subject && channelRecommendations[subject]) {
    channelRecommendations[subject].forEach(channel => {
      links.push({
        type: "channel",
        url: `https://www.youtube.com/results?search_query=${channel.query}`,
        description: `${channel.name}: ${searchQuery}`
      });
    });
  }

  return links.slice(0, count);
}

// ---------------------------------------------------------
// FILE MATCH
// ---------------------------------------------------------
function smartFilterFiles(query, fileIndex) {
  const allFiles = Object.keys(fileIndex);
  let filtered = allFiles;

  const mod = extractModule(query);
  const sem = extractSem(query);
  const subj = extractSubject(query);

  if (mod) {
    filtered = filtered.filter(f =>
      f.toLowerCase().includes(`module ${mod}`) ||
      f.toLowerCase().includes(`module_${mod}`) ||
      f.toLowerCase().includes(`mod ${mod}`) ||
      f.toLowerCase().includes(`${mod}.`)
    );
  }

  if (sem) {
    filtered = filtered.filter(f =>
      f.toLowerCase().includes(`${sem}rd sem`) ||
      f.toLowerCase().includes(`${sem}th sem`) ||
      f.toLowerCase().includes(`${sem}nd sem`) ||
      f.toLowerCase().includes(`${sem}st sem`)
    );
  }

  if (subj) {
    filtered = filtered.filter(f => f.toLowerCase().includes(subj));
  }

  if (filtered.length === 0) return allFiles;
  return filtered;
}

function findSmartFile(query, fileIndex) {
  const filtered = smartFilterFiles(query, fileIndex);

  const result = stringSimilarity.findBestMatch(
    query.toLowerCase(),
    filtered.map(f => f.toLowerCase())
  );

  return filtered[result.bestMatchIndex];
}

// ---------------------------------------------------------
// GROQ CLIENT
// ---------------------------------------------------------
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

const LLM_MODEL = "llama-3.1-8b-instant";

// ---------------------------------------------------------
// OLLAMA EMBEDDINGS
// ---------------------------------------------------------
async function embedQuery(text) {
  const r = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text
    })
  });

  const data = await r.json();

  if (!data.embedding) {
    throw new Error("Ollama embedding failed: " + JSON.stringify(data));
  }

  return data.embedding;
}

function cleanContext(text) {
  return text
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\n+/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------
// QUERY EXPANSION
// ---------------------------------------------------------
async function expandQuery(question) {
  const prompt = `
Given this question, generate 2 alternative phrasings that mean the same thing.
Return ONLY the alternatives, one per line, no numbering.

Question: ${question}

Alternatives:
`;

  const r = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 120
  });

  const alternatives = r.choices[0].message.content
    .trim()
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 2);

  return [question, ...alternatives];
}

// ---------------------------------------------------------
// CLASSIFIER
// ---------------------------------------------------------
async function classifyMessage(question) {
  const prompt = `
Classify into EXACTLY one label:
SMALL_TALK
DIRECT_NOTES_REQUEST
NOTES_QUERY
OTHER

Return ONLY the label.

USER MESSAGE:
"${question}"
`;

  const r = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 10
  });

  return r.choices[0].message.content.trim().toUpperCase();
}

// ---------------------------------------------------------
// SMALL TALK
// ---------------------------------------------------------
async function runSmallTalkLLM(question) {
  const prompt = `
Reply short and friendly.
If message contains ANY academic intent, reply EXACTLY:
Not in notes.

User: ${question}
Reply:
`;

  const r = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 80
  });

  return r.choices[0].message.content.trim();
}

// ---------------------------------------------------------
// CHROMA CLIENT
// ---------------------------------------------------------
const chroma = new ChromaClient({
  path: CHROMA_URL
});

// ---------------------------------------------------------
// RETRIEVAL + DEDUPE
// ---------------------------------------------------------
async function retrieveWithReranking(question, topK = 10, finalK = 5) {
  const collection = await chroma.getCollection({ name: "rag_academic_docs" });

  const queries = await expandQuery(question);

  const allResults = [];

  for (const q of queries) {
    const qEmbedding = await embedQuery(q);

    const results = await collection.query({
      queryEmbeddings: [qEmbedding],
      nResults: Math.ceil(topK / queries.length),
      include: ["documents", "metadatas", "distances"]
    });

    const docs = results.documents?.[0] || [];
    const metas = results.metadatas?.[0] || [];
    const distances = results.distances?.[0] || [];

    for (let i = 0; i < docs.length; i++) {
      allResults.push({
        document: docs[i],
        metadata: metas[i],
        distance: distances[i]
      });
    }
  }

  const uniqueResults = [];
  const seen = new Set();

  for (const r of allResults) {
    const hash = (r.document || "").substring(0, 140);
    if (!seen.has(hash)) {
      seen.add(hash);
      uniqueResults.push(r);
    }
  }

  uniqueResults.sort((a, b) => a.distance - b.distance);

  const topResults = uniqueResults.slice(0, finalK);

  return {
    documents: topResults.map(r => r.document),
    metadatas: topResults.map(r => r.metadata)
  };
}

// ---------------------------------------------------------
// STRICT STRUCTURED ANSWER (NO EXAMPLE HEADING IF NOT PRESENT)
// ---------------------------------------------------------
async function runLLM(question, context) {
  const prompt = `
You are a STRICT retrieval-grounded academic assistant.

RULES:
1) Use ONLY CONTEXT.
2) If not found, reply EXACTLY: Not in notes.
3) Keep it exam-ready.
4) Output MUST be clean markdown.

FORMAT:
DEFINITION:
- (1 to 3 lines)

KEY POINTS:
- Point 1
- Point 2
- Point 3

OPTIONAL EXAMPLE:
- Only include this section if the context contains a real example.
- If there is no example in context, DO NOT show the heading.

CONTEXT USED:
- Copy 1-2 exact lines from the context.

CONTEXT:
${context}

QUESTION:
${question}

ANSWER:
`;

  const r = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 600
  });

  let answer = r.choices?.[0]?.message?.content || "Not in notes.";

  // Clean formatting
  answer = answer.replace(/\n{3,}/g, "\n\n").trim();

  // If model accidentally wrote EXAMPLE: Not in notes, remove it
  answer = answer.replace(/OPTIONAL EXAMPLE:\s*-?\s*Not in notes\.?/gi, "");
  answer = answer.replace(/EXAMPLE:\s*-?\s*Not in notes\.?/gi, "");

  // Extra cleanup
  answer = answer.replace(/\n{3,}/g, "\n\n").trim();

  return answer;
}

// ---------------------------------------------------------
// HEALTH
// ---------------------------------------------------------
app.get("/health", async (req, res) => {
  try {
    const ollamaCheck = await fetch(`${OLLAMA_URL}/api/tags`);
    const okOllama = ollamaCheck.ok;

    res.json({
      status: "ok",
      chroma: CHROMA_URL,
      ollama: OLLAMA_URL,
      ollama_ok: okOllama,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ status: "bad", error: e.message });
  }
});

// ---------------------------------------------------------
// CHAT ENDPOINT
// ---------------------------------------------------------
app.post("/chat", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) return res.status(400).json({ error: "Question missing" });

    console.log("\nQUESTION:", question);

    const category = await classifyMessage(question);
    console.log("CATEGORY:", category);

    const subject = extractSubject(question);
    const topic = extractTopic(question, subject);
    const youtubeLinks = generateYouTubeLinks(question, subject, topic);

    // SMALL TALK
    if (category === "SMALL_TALK") {
      const answer = await runSmallTalkLLM(question);
      return res.json({
        question,
        answer,
        source_label: null,
        source_link: null,
        youtube_links: []
      });
    }

    // DIRECT NOTES REQUEST
    if (category === "DIRECT_NOTES_REQUEST") {
      const bestFile = findSmartFile(question, fileIndex);
      const link = fileIndex[bestFile];

      if (!link) {
        return res.json({
          question,
          answer: "Not in notes.",
          source_label: null,
          source_link: null,
          youtube_links: youtubeLinks
        });
      }

      return res.json({
        question,
        answer: "Here are the notes.",
        source_label: bestFile,
        source_link: link,
        youtube_links: youtubeLinks
      });
    }

    // NOTES QUERY
    if (category === "NOTES_QUERY") {
      const { documents: docs, metadatas: metas } = await retrieveWithReranking(question);

      const context = cleanContext(docs.join("\n\n"));
      const answer = await runLLM(question, context);

    let sourceLabel = null;
let sourceLink = null;

const meta = metas[0] || {};

// page json name stored in chroma metadata
const pageSource =
  meta.source ||
  meta.pdf ||
  meta.source_page ||
  "";

// show source label
if (pageSource) {
  sourceLabel = pageSource;
}

// map pageSource -> pdf drive link using fuzzy match
if (pageSource && Object.keys(fileIndex).length > 0) {
  const bestPdfKey = findSmartFile(pageSource, fileIndex);
  if (bestPdfKey) {
    sourceLink = fileIndex[bestPdfKey] || null;
  }
}



      return res.json({
        question,
        answer,
        source_label: sourceLabel,
        source_link: sourceLink,
        youtube_links: youtubeLinks
      });
    }

    // OTHER
    return res.json({
      question,
      answer: "Ask academic questions or request notes.",
      source_label: null,
      source_link: null,
      youtube_links: youtubeLinks
    });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
app.listen(4000, () => {
  console.log("✅ RAG Chatbot running at http://localhost:4000");
  console.log("Groq model:", LLM_MODEL);
  console.log("Chroma:", CHROMA_URL);
  console.log("Ollama:", OLLAMA_URL);
});
