// backend/test-openai.js
import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

console.log("Has OPENAI_API_KEY:", !!process.env.OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // same model as aiClient.js
      messages: [{ role: "user", content: "Say hello from Libraverse!" }],
    });

    console.log("✅ OpenAI response:");
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("❌ OpenAI test error:");
    console.error("message:", error.message);
    if (error.response?.data) {
      console.error("response data:", error.response.data);
    }
  }
}

test();
