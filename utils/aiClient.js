// backend/utils/aiClient.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateBookInsights({ title, description, genre, author }) {
  const params = { title, description, genre, author };

  // If no key at all → directly fallback
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[AI] OPENAI_API_KEY missing. Using fallback insights.");
    return buildFallbackInsights(params);
  }

  try {
    const prompt = `
You are a helpful librarian AI. Analyze the following book and answer in clear, simple English.

Book title: ${title}
Author: ${author || "Unknown"}
Genre: ${genre || "Unknown"}
Description: ${description || "No description provided"}

Give the response in this structure (plain text, not JSON):
1. Short Summary (2–3 lines)
2. Who should read this? (audience / level)
3. What will the reader learn or enjoy?
4. Similar books / genres to explore (generic suggestions, no made-up book names).
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // same model you used in the test
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices?.[0]?.message?.content || "";
    return content.trim();
  } catch (error) {
    console.error("[AI] OpenAI error in generateBookInsights:", error?.message);

    // If it's a quota error (429) or any OpenAI issue → fallback instead of throwing
    if (error?.response?.status === 429) {
      console.warn("[AI] Quota exceeded. Using fallback insights.");
    }

    return buildFallbackInsights(params);
  }
}

// 🔹 Simple non-AI fallback so the feature still "works" nicely without quota
function buildFallbackInsights({ title, description, genre, author }) {
  const safeTitle = title || "this book";
  const safeGenre = genre || "the given genre";
  const safeAuthor = author || "the listed author";

  const shortDesc =
    description && description.length > 20
      ? description.slice(0, 180) + (description.length > 180 ? "..." : "")
      : description || "No detailed description is available in the system.";

  return [
    `1. Short Summary:\n${safeTitle} is a ${safeGenre.toLowerCase()} title available in the library. Based on its description, it offers readers an engaging experience and explores themes related to: ${shortDesc}`,
    "",
    `2. Who should read this?\nThis book is well suited for readers who enjoy ${safeGenre.toLowerCase()} and want to explore more works by authors like ${safeAuthor}. It can be a good fit for students, casual readers, or anyone curious about this area.`,
    "",
    `3. What will the reader learn or enjoy?\nReaders can expect to gain more insight into the ideas mentioned in the book description and enjoy the storytelling style of ${safeAuthor}. It may help them think about the topic from new perspectives or simply provide a relaxing reading experience.`,
    "",
    `4. Similar books / genres to explore:\nReaders who like this book may also enjoy other ${safeGenre.toLowerCase()} titles in the library catalogue, as well as books by related authors or stories that explore similar themes and tones.`,
  ].join("\n");
}
