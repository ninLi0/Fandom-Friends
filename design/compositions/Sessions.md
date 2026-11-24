# Sessions

Sessions connect accepted account credentials to opaque sessions that expire on
their own. The browser keeps the session in a cookie it cannot read from page
code, so no page ever handles the session value.

Registration [creates an account and starts a session](reaction:Sessions.EnteringApplication.Register)
for the returned account, which is identified by its username.
[Sign-in](reaction:Sessions.EnteringApplication.SignIn) proves an existing account's
credentials and starts a new session for it. In both cases the caller cannot
choose a different subject.

```endpoints
Sessions.EnteringApplication.Register at /auth/register
Sessions.EnteringApplication.SignIn at /auth/sign-in
```

An [active session resolves to its username](reaction:Sessions.CurrentAccount.CurrentUser).
Every other signed-in request resolves its session the same way and uses that
username as the person acting. An unknown, ended, or expired session identifies
nobody.

```endpoints
Sessions.CurrentAccount.CurrentUser at /auth/current
```

[Signing out ends the presented session](reaction:Sessions.LeavingApplication.SignOut).
Other sessions for the same account stay as they were.

```endpoints
Sessions.LeavingApplication.SignOut at /auth/sign-out
```
