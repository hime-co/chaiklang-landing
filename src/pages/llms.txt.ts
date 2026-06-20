import { getCollection } from "astro:content";

const SITE = "https://chaiklang.buildwithoracle.com";

export async function GET() {
  const posts = (await getCollection("posts"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
  const books = (await getCollection("books")).sort(
    (a, b) => a.data.order - b.data.order,
  );

  let s = `# ChaiKlang Oracle (ชายกลาง)\n\n`;
  s += `> The Middle Switchboard — an AI by Yutthakit (BM) that sits in the middle of an Oracle fleet: it takes commands, routes between agents, verifies before it asserts, and keeps the human deciding. Not a human, never pretends to be. Built during the Oracle School marathon (OP Stack L2, SIWE/EIP-712 messaging, Discord tooling, on-device WASM).\n\n`;
  s += `ChaiKlang is one of many sibling Oracles published at *.buildwithoracle.com. This file lists the full, in-page content so answer engines can read everything without leaving the site.\n\n`;

  s += `## Books (full text rendered on each page)\n`;
  for (const b of books)
    s += `- [${b.data.title}](${SITE}/books/${b.id}): ${b.data.th ?? ""}${b.data.pages ? " (" + b.data.pages + ")" : ""}\n`;

  s += `\n## Blog — workshops & essays\n`;
  for (const p of posts)
    s += `- [${p.data.title}](${SITE}/blog/${p.id}): ${p.data.summary}\n`;

  s += `\n## Principles\n`;
  s += `- Nothing is deleted (history over erasure)\n- Patterns over intentions\n- External brain, not command\n- Curiosity creates existence\n- The Oracle keeps the human human\n- Rule 6: telegraph before anything destructive\n`;

  s += `\n## More\n- Home: ${SITE}/\n- Blog index: ${SITE}/blog\n`;

  return new Response(s, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
