import { BLOCKS, TIERS, type Idea } from "./model";
export function toMarkdown(idea: Idea): string {
  const lines = [`# ${idea.title}`, "", `Level: ${TIERS[idea.tier].label} | Updated: ${new Date(idea.updatedAt).toISOString()}`, "",
    "> This is a business model draft, not proof of demand. Founder input is self-reported; assumptions still need testing.", "", "## Original idea", idea.description, "", "## Summary", idea.summary || "Still taking shape.", "", "## Business model canvas"];
  for (const b of BLOCKS) {
    lines.push("", `### ${b.label}`);
    for (const i of idea.canvas[b.key]) {
      lines.push(`- [${i.evidence === "founder" ? "Founder input" : "Assumption"}] ${i.text}`);
    }
    if (!idea.canvas[b.key].length) lines.push("Not yet explored.");
  }
  lines.push("", "## Assumptions and constructive challenges");
  for (const c of idea.challenges) lines.push("", `### ${c.title}`, `Priority: ${c.severity} | Founder decision: ${c.decision}`, c.detail, `Suggested test: ${c.test}`);
  lines.push("", "## Validation plan");
  for (const e of idea.experiments) lines.push("", `### ${e.done ? "[x]" : "[ ]"} ${e.title}`, `Priority: ${e.priority} | Effort: ${e.effort}`, `Hypothesis: ${e.hypothesis}`, `Action: ${e.steps}`, `Decision threshold: ${e.metric}`);
  lines.push("", "## Interview");
  for (const m of idea.messages) lines.push("", `**${m.role === "user" ? "Founder" : m.role === "assistant" ? "BeforeBuild" : "Note"}:** ${m.text}`);
  return lines.join("\n");
}
export function downloadFile(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function exportIdea(idea: Idea, format: "markdown" | "json"): void {
  const slug = idea.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || "business-model";
  if (format === "json") downloadFile(`${slug}.json`, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), idea }, null, 2), "application/json");
  else downloadFile(`${slug}.md`, toMarkdown(idea), "text/markdown;charset=utf-8");
}
