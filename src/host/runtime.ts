import { AsyncLocalStorage } from "node:async_hooks";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import type { Db } from "mongodb";
import type { FandomFriendsWire } from "../../generated/wire.ts";
import { assembleApplication, createInstances, executionLimits } from "../assembly.ts";
import type { PasswordHashing } from "../concepts/Authenticating/Authenticating.ts";
import { fandomFriendsPolicy, publicErrors, refusalSentence } from "./http-policy.ts";

/** What is added to a refused request's answer: the refusal's code, and a sentence a page can show. */
interface Explanation {
  code?: string;
  detail?: string;
}

/**
 * What a refused answer may say about a concept's refusal code. A code with no public category is answered as
 * INTERNAL_ERROR, so nothing is said about it: its code and sentence stay inside the server.
 */
export function explanationOf(code: string): Explanation {
  return Object.hasOwn(publicErrors, code) ? { code, detail: refusalSentence(code) } : {};
}

/**
 * Assembles the application on one database and binds it to HTTP.
 * Tests call this with their own database and origin; the server calls it once at startup.
 */
export function createRuntime({ database, publicOrigin, clock = () => new Date(), passwordHashing }: {
  database: Db;
  publicOrigin: string;
  clock?: () => Date;
  /** Only tests pass this, to make registering many people quick. */
  passwordHashing?: PasswordHashing;
}) {
  const instances = createInstances(database, clock, { passwordHashing });
  const application = assembleApplication(instances, clock);
  const gateway = createGateway<FandomFriendsWire>({ application, executionLimits });

  // The HTTP adapter reports a refusal only by its public category, such as CONFLICT. The gateway's own answer
  // still names the refusal, so it is noted here and `handle` adds its code and sentence to the response.
  // A request whose input fails its validator is reported as INVALID_REQUEST with nothing else; the validator's
  // own reason is noted the same way.
  const refusals = new AsyncLocalStorage<Explanation>();
  const invoke = gateway.invoke.bind(gateway);
  gateway.invoke = (async (path, input, options) => {
    const result = await invoke(path, input, options);
    const noted = refusals.getStore();
    if (noted && !result.ok) {
      const { error } = result;
      if (error.kind === "domain" && typeof error.value === "string") {
        Object.assign(noted, explanationOf(error.value));
      } else if (error.kind === "framework" && error.code === "INVALID_INPUT" && typeof error.detail === "string") {
        noted.detail = `The request was not understood: ${error.detail}.`;
      }
    }
    return result;
  }) as typeof gateway.invoke;

  const answer = createHttpHandler({ application, gateway, policy: fandomFriendsPolicy(publicOrigin) });

  /**
   * Answers one API request. A refusal's body is `{ error, code, detail }`: the public category, the refusal's
   * own code, and a sentence a page can show as it is.
   */
  async function handle(request: Request): Promise<Response> {
    const noted: Explanation = {};
    const response = await refusals.run(noted, () => answer(request));
    if (response.ok || (noted.code === undefined && noted.detail === undefined)) return response;
    const body = (await response.clone().json().catch(() => null)) as unknown;
    if (body === null || typeof body !== "object" || Array.isArray(body)) return response;
    const headers = new Headers(response.headers);
    headers.delete("Content-Length");
    return new Response(JSON.stringify({ ...body, ...noted }), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return { application, gateway, handle, instances };
}
