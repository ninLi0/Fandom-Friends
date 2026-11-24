import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { MongoClient } from "mongodb";
import { assembleApplication, createInstances } from "./src/assembly.ts";
import { fandomFriendsPolicy } from "./src/host/http-policy.ts";
import { localMongoUri } from "./src/storage/mongo.ts";

function assembleForChecks() {
  // Construction only: the tools inspect declarations and never run database actions,
  // so this client never connects.
  const client = new MongoClient(localMongoUri);
  return assembleApplication(createInstances(client.db("fandomfriends_spec_check")));
}

export default {
  assemble: assembleForChecks,
  title: "Fandom Friends",
  wireName: "FandomFriendsWire",
  projections: [httpWire({ policy: fandomFriendsPolicy("http://localhost:3000"), name: "FandomFriendsHttp" })],
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/Sessions.md", import.meta.url),
      new URL("./design/compositions/Bios.md", import.meta.url),
      new URL("./design/compositions/Sharing.md", import.meta.url),
      new URL("./design/compositions/Vocabulary.md", import.meta.url),
      new URL("./design/compositions/Discovery.md", import.meta.url),
    ],
  },
};
