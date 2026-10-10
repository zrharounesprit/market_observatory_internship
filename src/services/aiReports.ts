import { prisma } from "../db/client";
import { getMarketOverview, getCompetitorComparison } from "./analytics";

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Calls the Gemini API directly via REST (no SDK dependency, one less thing
 * to get wrong on version/import syntax). Throws on non-2xx so callers can
 * surface a clean 502 instead of a confusing downstream error.
 */
async function callGemini(
  prompt: string,
  maxOutputTokens: number
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in .env");
  }

  const response = await fetch(
    `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],

        generationConfig: {
          maxOutputTokens,

          // Gemini 3.x uses thinkingLevel instead of
          // thinkingBudget.
          thinkingConfig: {
            thinkingLevel: "minimal",
          },
        },
      }),
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Gemini API error ${response.status}: ${responseText}`
    );
  }

  let data: any;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Gemini returned invalid JSON: ${responseText}`
    );
  }

  const candidate = data?.candidates?.[0];

  if (!candidate) {
    throw new Error(
      `Gemini returned no candidates: ${JSON.stringify(data)}`
    );
  }

  const finishReason = candidate.finishReason;

  if (finishReason && finishReason !== "STOP") {
    console.warn(
      `Gemini finishReason: ${finishReason}`
    );
  }

  const text =
    candidate.content?.parts
      ?.map((part: any) => part.text ?? "")
      .join("") ?? "";

  if (!text.trim()) {
    throw new Error(
      `Gemini returned an empty response: ${JSON.stringify(data)}`
    );
  }

  return text.trim();
}
/**
 * Generates a market report + suggestions from already-aggregated stats
 * (never raw scraped text — keeps token usage low and output grounded in
 * real numbers instead of the model inventing figures).
 */
export async function generateMarketReport(periodDays = 30) {
  const overview = await getMarketOverview();
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const prompt = `You are a Tunisian automotive market analyst. Based on the following
aggregated data (already computed from real listings, do not invent numbers),
write a concise market report in French or English matching a business report tone.

Data (last ${periodDays} days):
${JSON.stringify(overview, null, 2)}

Structure the report as:
1. Market summary (2-3 sentences)
2. Key trends per top brand
3. Three concrete suggestions for a dealership competing in this market

Keep it under 400 words. Output plain markdown, no preamble.`;

  const content = await callGemini(prompt, 2048);

  // Split off a short summary line for list views, keep full content too
  const summary = content.split("\n").find((l) => l.trim().length > 0) ?? "";

  const report = await prisma.marketReport.create({
    data: {
      title: `Market Report — ${periodStart.toISOString().slice(0, 10)} to ${periodEnd
        .toISOString()
        .slice(0, 10)}`,
      periodStart,
      periodEnd,
      content,
      summary,
    },
  });

  return report;
}

/**
 * Narrower report: suggestions for one brand/model based on competitor
 * comparison data. Useful for "how should we price this model" queries.
 */
export async function generateCompetitorSuggestion(brandId: string, modelId?: string) {
  const comparison = await getCompetitorComparison(brandId, modelId);

  const prompt = `Based on this competitor pricing data for a specific car model in Tunisia,
give 3 short, actionable pricing/positioning suggestions for a dealership. Data:
${JSON.stringify(comparison, null, 2)}

Output as a markdown bullet list only, no preamble.`;

  return callGemini(prompt, 800);
}
