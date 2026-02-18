import fetch from "node-fetch";

const ask = async () => {
  const question = process.argv.slice(2).join(" ");

  if (!question) {
    console.log("Usage: node cli_test.js \"your question\"");
    process.exit(1);
  }

  try {
    const response = await fetch("http://localhost:4000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
  const txt = await response.text();
  console.log("SERVER ERROR:", txt);
  return;
}

    const data = await response.json();

    console.log("\n========================");
    console.log("QUESTION:");
    console.log(question);

    console.log("\nANSWER:");
    console.log(data.answer || "No answer returned");

    console.log("\nSOURCE LINK:");
    console.log(data.source_link || "No source link");

    console.log("\nYOUTUBE LINKS:");
if (data.youtube_links && data.youtube_links.length > 0) {
  data.youtube_links.forEach((l, i) => {
    console.log(`${i + 1}) ${l.description}`);
    console.log(`   ${l.url}`);
  });
} else {
  console.log("No youtube links");
}


    console.log("========================\n");

  } catch (err) {
    console.error("CLI ERROR:", err.message);
  }
};

ask();
