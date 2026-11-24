/**
 * The look of everything around the editor: the top bar, the status line, the sign-in page, and the search page.
 * It uses the editor's own colors, type, and control shapes (see editor-styles.ts) so the pages read as one site.
 */
export const siteStyles = `
/* The top bar, on every page. */
#bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; padding-block: 14px; border-bottom: 1px solid #dfe3ef; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #18203b; -webkit-font-smoothing: antialiased; }
#bar .brand { display: inline-flex; align-items: center; gap: 9px; margin-right: 6px; font-size: 18px; font-weight: 800; letter-spacing: -.035em; line-height: 1.2; color: #18203b; white-space: nowrap; }
#bar .brand::before { content: ""; width: 14px; height: 14px; border-radius: 5px; background: #234ee8; box-shadow: 5px 5px 0 #ed513d; margin-right: 5px; }
#bar .site-nav { display: flex; flex-wrap: wrap; gap: 4px; }
#bar .site-nav a { padding: 8px 12px; border-radius: 10px; font-size: 14px; font-weight: 650; line-height: 1.4; color: #506079; text-decoration: none; }
#bar .site-nav a:hover { background: #eaf0ff; color: #234ee8; }
#bar .site-nav a[aria-current="page"] { background: #eef1fc; color: #234ee8; font-weight: 700; }
#bar .account { margin-left: auto; display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 6px 10px; font-size: 13px; line-height: 1.4; color: #657087; }
#bar .account button { min-height: 36px; padding: 7px 13px; border: 1px solid #dfe3ef; border-radius: 10px; background: transparent; color: #506079; font: inherit; font-weight: 650; cursor: pointer; }
#bar .account button:hover { border-color: #abb6d2; background: #fff; color: #18203b; }
#bar a:focus-visible, #bar button:focus-visible { outline: 3px solid #809aff; outline-offset: 2px; }

/* The status line: nothing when it has nothing to say, a quiet note when it does. */
body:not(:has(.editor-page)) > #status { min-height: 0; padding: 0; background: transparent; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; font-weight: 650; line-height: 1.5; }
body:not(:has(.editor-page)) > #status:not(:empty) { margin-top: 12px; padding: 10px 14px; border: 1px solid #d8e1ff; border-radius: 10px; background: #eef2ff; color: #2548b2; }

/* The sign-in and search pages use the editor's canvas and width. */
body:has(.sign-in-page), body:has(.search-page) { max-width: none; min-width: 320px; padding: 0; background: #f6f7fb; }
body:has(.sign-in-page) > #bar, body:has(.search-page) > #bar { max-width: 1304px; margin-inline: auto; padding-inline: 42px; box-sizing: border-box; }
body:has(.sign-in-page) > #status, body:has(.search-page) > #status { width: min(1220px, calc(100% - 84px)); margin-inline: auto; box-sizing: border-box; }
.sign-in-page, .search-page { box-sizing: border-box; max-width: 1304px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #18203b; -webkit-font-smoothing: antialiased; }
.sign-in-page *, .search-page * { box-sizing: border-box; }
.sign-in-page h1, .search-page > h1 { margin: 0 0 10px; font-size: clamp(30px, 4vw, 40px); font-weight: 800; letter-spacing: -.035em; line-height: 1.1; }
.sign-in-page :focus-visible, .search-page :focus-visible { outline: 3px solid #809aff; outline-offset: 3px; }

/* Buttons, shaped like the editor's. */
.sign-in-page .site-button, .search-page .result > a { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 11px 19px; border: 1px solid transparent; border-radius: 10px; font: inherit; font-size: 14px; font-weight: 700; line-height: 1.4; text-decoration: none; cursor: pointer; transition: background .15s ease, border-color .15s ease; }
.sign-in-page .site-button.primary { background: #234ee8; color: #fff; box-shadow: 0 3px 0 rgba(21, 47, 156, .15); }
.sign-in-page .site-button.primary:hover { background: #193bc0; }
.sign-in-page .site-button.secondary, .search-page .result > a { background: #fff; color: #18203b; border-color: #dfe3ef; }
.sign-in-page .site-button.secondary:hover, .search-page .result > a:hover { border-color: #abb6d2; background: #fafbff; }

/* Sign in: the form in a panel, with a sample card beside it on a wide screen and below it on a phone. */
.sign-in-page { display: grid; grid-template-columns: minmax(0, 440px) minmax(0, 440px); justify-content: center; align-items: center; gap: 64px; padding: 56px 42px 72px; }
.sign-in-page .sign-in-panel { padding: 34px; border: 1px solid #dfe3ef; border-radius: 18px; background: #fff; box-shadow: 0 5px 15px #192c6b08; }
.sign-in-page .pitch { margin: 0; font-size: 16px; line-height: 1.6; color: #657087; }
.sign-in-page form { display: grid; gap: 6px; max-width: none; margin-top: 26px; }
.sign-in-page label { font-size: 14px; font-weight: 650; line-height: 1.5; }
.sign-in-page input { width: 100%; padding: 12px 14px; border: 1px solid #cfd6e6; border-radius: 10px; background: #fff; color: #18203b; font: inherit; font-size: 15px; line-height: 1.4; }
.sign-in-page input:hover { border-color: #abb6d2; }
.sign-in-page input:focus { border-color: #234ee8; }
.sign-in-page .help { margin: 0 0 12px; font-size: 12px; line-height: 1.6; color: #657087; }
.sign-in-page .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.sign-in-page .actions .site-button { flex: 1 1 150px; }
.sign-in-page .sign-in-sample { min-width: 0; }
.sign-in-page .sign-in-sample > p { margin: 0 0 12px; font-size: 13px; font-weight: 650; line-height: 1.5; color: #657087; }

/* Search: chosen tags as chips, people as a grid of cards. */
.search-page { padding: 40px 42px 72px; }
.search-page > p { max-width: 62ch; margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #657087; }
.search-page .tag-picker { max-width: 520px; margin: 0 0 14px; }
.search-page .tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.search-page .tags li { display: inline-flex; align-items: center; gap: 3px; padding: 2px 3px 2px 10px; border: 1px solid #d8e1ff; border-radius: 7px; background: #eef2ff; color: #2548b2; font-size: 12px; font-weight: 600; line-height: 1.4; }
.search-page .tags li button { min-width: 28px; min-height: 28px; padding: 1px 6px; border: 0; border-radius: 5px; background: none; color: inherit; font: inherit; font-size: 15px; line-height: 1.2; cursor: pointer; }
.search-page .tags li button:hover { background: #dfe6ff; }
.search-page .results { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 32px 24px; align-items: start; margin-top: 26px; }
.search-page .result { display: grid; gap: 12px; min-width: 0; }
.search-page .result > a { justify-self: start; }
.search-page .results > p { grid-column: 1 / -1; margin: 0; padding: 30px 20px; border: 1px dashed #cfd6e6; border-radius: 18px; background: #fff; text-align: center; font-size: 15px; line-height: 1.6; color: #657087; }

@media (max-width: 860px) {
  .sign-in-page { grid-template-columns: minmax(0, 480px); gap: 32px; padding: 32px 16px 56px; }
  .sign-in-page .sign-in-panel { padding: 26px 20px; }
  .search-page { padding: 28px 16px 56px; }
  body:has(.sign-in-page) > #bar, body:has(.search-page) > #bar { padding-inline: 16px; }
  body:has(.sign-in-page) > #status, body:has(.search-page) > #status { width: calc(100% - 32px); }
}
@media (prefers-reduced-motion: reduce) {
  .sign-in-page .site-button, .search-page .result > a { transition: none; }
}
`;
