# 📚 Yoru - AI Academic RAG Chatbot

Yoru is an AI-powered academic assistant that helps students interact with their college notes using Natural Language Processing (NLP), Retrieval-Augmented Generation (RAG), Google Gemini, and ChromaDB.

Instead of training a custom AI model, Yoru retrieves relevant information from uploaded academic PDFs and generates answers grounded only in those notes.

---

## 🚀 Features

- 📄 Upload and process academic PDF notes
- ✂️ Automatic text chunking
- 🧠 Semantic embeddings using Google Gemini
- 📦 Vector storage using ChromaDB
- 🔍 Semantic similarity search
- 🤖 AI-powered question answering
- 📚 Direct PDF/Notes retrieval
- 💬 Small-talk detection
- 📑 Source PDF links with every answer

---

# 🏗️ Project Architecture

```
PDF Notes
    │
    ▼
Extract Text
    │
    ▼
Create Chunks
    │
    ▼
Generate Embeddings (Gemini)
    │
    ▼
Store in ChromaDB
    │
    ▼
User Question
    │
    ▼
Generate Query Embedding
    │
    ▼
Semantic Search (ChromaDB)
    │
    ▼
Retrieve Relevant Chunks
    │
    ▼
Gemini 2.0 Flash
    │
    ▼
Grounded Answer + Source PDF
```

---

# 🛠️ Tech Stack

### Frontend

- HTML
- CSS
- JavaScript

### Backend

- Node.js
- Express.js

### AI

- Google Gemini 2.0 Flash
- Google text-embedding-004

### Vector Database

- ChromaDB

### Other

- Docker
- dotenv
- CORS

---

# 📂 Project Structure

```
yoru_chatbot/

│
├── stage1_text/
│      Extracted PDF text
│
├── stage2_chunks/
│      Chunk generation
│
├── stage3_embeddings2/
│      Gemini embeddings
│
├── stage4_upload/
│      Upload embeddings to ChromaDB
│
├── rag_project_frontend/
│      Frontend UI
│
├── rag_chatbot.js
│      Backend API
│
├── server.js
│
├── file_index.json
│
└── README.md
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/yoru-chatbot.git

cd yoru-chatbot
```

---

## Install Dependencies

```bash
npm install
```

---

## Create .env

```env
GEMINI_API_KEY=YOUR_API_KEY
```

---

## Start ChromaDB

Using Docker

```bash
docker run -p 8000:8000 chromadb/chroma
```

---

## Generate Chunks

```bash
node stage2_chunks/chunk_docs.js
```

---

## Generate Embeddings

```bash
node stage3_embeddings2/gemini_embeddings.js
```

---

## Upload to ChromaDB

```bash
node stage4_upload/upload_to_chroma.js
```

---

## Start Backend

```bash
node rag_chatbot.js
```

Runs at

```
http://localhost:4000
```

---

## Start Frontend

Open

```
rag_project_frontend/index.html
```

or run using VS Code Live Server.

---

# 🔍 How It Works

### 1. PDF Processing

Academic PDFs are converted into plain text.

---

### 2. Chunking

Large documents are divided into smaller chunks for better retrieval.

---

### 3. Embeddings

Each chunk is converted into a high-dimensional vector using:

```
Google Gemini
text-embedding-004
```

---

### 4. Vector Storage

Embeddings are stored in ChromaDB along with:

- Chunk text
- Source PDF
- Metadata
- PDF URL

---

### 5. User Query

When a student asks a question:

Example:

```
Explain process scheduling
```

The query is also converted into an embedding.

---

### 6. Semantic Search

ChromaDB compares the query embedding with stored embeddings using vector similarity search and retrieves the most relevant chunks.

---

### 7. Response Generation

The retrieved context is sent to Gemini 2.0 Flash, which generates an answer grounded only in the retrieved notes.

If the requested information is unavailable, the chatbot responds with:

```
Not in notes.
```

---

# 📦 APIs Used

- Google Gemini API
- Google Embedding API
- ChromaDB REST API

---

# 🧠 Concepts Used

- Retrieval-Augmented Generation (RAG)
- Natural Language Processing (NLP)
- Semantic Search
- Vector Embeddings
- Cosine Similarity
- Large Language Models (LLMs)
- Prompt Engineering

---

# 📈 Future Improvements

- User authentication
- Chat history persistence
- Multi-PDF uploads
- Voice interaction
- OCR for scanned PDFs
- Streaming responses
- Admin dashboard
- Fine-grained source citations

---

# 👨‍💻 Authors

Developed as an AI-powered academic assistant project.

---

# 📄 License

This project is intended for educational purposes.
