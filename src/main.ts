import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRuntime } from "./host/runtime.ts";
import { seedVocabulary } from "./seed/apply.ts";
import { serveSite } from "./host/site.ts";
import { connectMongo, withLock } from "./storage/mongo.ts";

// The class platform sets HOST and PORT. The app owner sets PUBLIC_ORIGIN to the app's https address.
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "localhost";
const publicOrigin = new URL(process.env.PUBLIC_ORIGIN ?? `http://localhost:${port}`).origin;
if (process.env.NODE_ENV === "production" && process.env.PUBLIC_ORIGIN === undefined) {
  // The API only answers pages served from publicOrigin, so a deployed app without it refuses every request.
  console.warn(`PUBLIC_ORIGIN is not set. The app will only work when opened at ${publicOrigin}.`);
}

// The pages are plain TypeScript, bundled here by the server. There is no separate build step.
async function buildPages() {
  const [page, bundle] = await Promise.all([
    readFile(new URL("./web/index.html", import.meta.url), "utf8"),
    Bun.build({
      entrypoints: [fileURLToPath(new URL("./web/client.ts", import.meta.url))],
      target: "browser",
      minify: true,
    }),
  ]);
  if (!bundle.success || bundle.outputs.length !== 1) {
    throw new Error(`Could not build the browser script: ${bundle.logs.join("\n")}`);
  }
  return { page, script: await bundle.outputs[0]!.text() };
}

// Building once at startup stops the server from starting with pages that do not compile.
// In production that one build is served. In development every page load builds again, so a saved change
// to a page shows as soon as the browser reloads.
const built = await buildPages();
const pages = process.env.NODE_ENV === "production" ? async () => built : buildPages;

const { client, db } = await connectMongo();

try {
  const runtime = createRuntime({ database: db, publicOrigin });
  // The tag list and templates in src/seed/vocabulary.ts are loaded on every start. Only what is missing is added.
  // The lock makes two servers that start together load one after the other, so neither adds a tag twice.
  const added = await withLock(db, "vocabulary", () => seedVocabulary(runtime.instances));
  console.log(
    `Vocabulary: added ${added.tagsDefined} tags, ${added.namesLinked} other names, ` +
      `${added.placementsMade} placements, ${added.templatesDefined} templates.`,
  );
  const server = Bun.serve({ port, hostname, fetch: serveSite({ api: runtime.handle, pages }) });
  console.log(`Fandom Friends is ready at ${publicOrigin}`);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    server.stop();
    await runtime.gateway.beginDrain();
    await client.close();
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
} catch (error) {
  await client.close();
  throw error;
}
