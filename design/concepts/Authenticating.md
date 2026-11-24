# Authenticating

## Purpose

Establish who a person is from a username and a password, so that a claim of
identity alone is not accepted as proof.

## Principle

Ari registers the username `ari` with a password. `_registered` then reports
`ari` as registered, and a second registration of `ari` is refused.
Authenticating `ari` with a wrong password is refused. The correct password
authenticates Ari and returns the account, which is identified by the username
`ari`.

## Types

```types
opaque Secret
  A password verifier. Its representation is the implementer's choice, and the password cannot be read back from it.
```

## State

```state
a set of Accounts with
  a unique username String
  a passwordVerifier Secret
```

## Actions

```actions
register (username: String, password: String) : returns (account: Account)
  where username is not 3 to 32 letters, digits, underscores, or hyphens
  then
    refuses INVALID_USERNAME "A username must contain 3 to 32 letters, numbers, underscores, or hyphens."
  where password is shorter than 8 characters or longer than 128 characters
  then
    refuses WEAK_PASSWORD "A password must contain 8 to 128 characters."
  where username is already registered
  then
    refuses USERNAME_TAKEN "That username is already registered."
  where username and password are accepted
  then
    add a new account with username and a verifier derived from password
    bind account to that account
    returns account

authenticate (username: String, password: String) : returns (account: Account)
  where username is unknown or password does not verify
  then
    refuses INVALID_CREDENTIALS "The username or password is incorrect."
  where password verifies
  then
    bind account to the verified account
    returns account
```

## Queries

```queries
_registered (username: String) : one (registered: Flag)
  answers false for an unknown username
```
