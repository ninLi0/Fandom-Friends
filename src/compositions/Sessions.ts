/**
 * Accounts and browser sessions: registering, signing in and out, and resolving the current user.
 *
 * Authenticating proves an account, which is identified by its username. Sessioning holds an opaque
 * session for an external subject. Neither names the other; the adaptation lives here.
 *
 * Adapted from the message-board example in @mit-sdg/sync-engine 1.2.0 (Apache-2.0). See THIRD_PARTY_NOTICES.md.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";
import {
  credentialsInput,
  issuedSessionOutput,
  sessionOnlyInput,
  signedOutOutput,
  usernameOutput,
} from "./validators.ts";

const { Authenticating, Sessioning } = concepts;

const Register = endpoint(
  "/auth/register",
  ({ username, password, account, session, expiresAt }) =>
    receive({ username, password })
      .then(Authenticating.register({ username, password }).responds({ account }))
      .then(Sessioning.start({ subject: account }).responds({ session, expiresAt }))
      .then(respond({ username: account, session, expiresAt })),
  {
    input: { required: ["username", "password"] },
    validators: { input: credentialsInput, output: issuedSessionOutput },
  },
);

const SignIn = endpoint(
  "/auth/sign-in",
  ({ username, password, account, session, expiresAt }) =>
    receive({ username, password })
      .then(Authenticating.authenticate({ username, password }).responds({ account }))
      .then(Sessioning.start({ subject: account }).responds({ session, expiresAt }))
      .then(respond({ username: account, session, expiresAt })),
  {
    input: { required: ["username", "password"] },
    validators: { input: credentialsInput, output: issuedSessionOutput },
  },
);

const CurrentUser = endpoint(
  "/auth/current",
  ({ session, username }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: username }))
      .then(respond({ username })),
  {
    input: { required: ["session"] },
    validators: { input: sessionOnlyInput, output: usernameOutput },
  },
);

const SignOut = endpoint(
  "/auth/sign-out",
  ({ session }) =>
    receive({ session })
      .then(Sessioning.end({ session }).responds({ session }))
      .then(respond({ signedOut: true })),
  {
    input: { required: ["session"] },
    validators: { input: sessionOnlyInput, output: signedOutOutput },
  },
);

export const composition = {
  EnteringApplication: { Register, SignIn },
  CurrentAccount: { CurrentUser },
  LeavingApplication: { SignOut },
};
