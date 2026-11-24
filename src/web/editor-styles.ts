/** Scoped styles copied from the original local MVP editor. */
export const editorStyles = `
/* Original editor/card declarations from 89c72bf:public/styles.css.
   Only selectors, alpha look-name aliases, and the alpha page wrapper are adapted. */
.editor-page, .tag-picker, .card.bio-card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #18203b;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  --blue: #234ee8;
  --blue-dark: #193bc0;
  --red: #ed513d;
  --ink: #18203b;
  --muted: #657087;
  --line: #dfe3ef;
  --soft: #eef1fc;
  --radius: 18px;
}
/* Let only the editor use its original page width and canvas. */
body:has(.editor-page) { max-width: none; min-width: 320px; padding: 0; background: #f6f7fb; }
body:has(.editor-page) > #bar, body:has(.editor-page) > #status { max-width: 1304px; margin-inline: auto; padding-inline: 42px; box-sizing: border-box; }
.editor-page [hidden], .tag-picker [hidden] { display: none !important; }
.editor-page *, .tag-picker *, .card.bio-card * { box-sizing: border-box; }
.editor-page button, .tag-picker button, .card.bio-card button, .editor-page input, .tag-picker input, .card.bio-card input, .editor-page select, .tag-picker select, .card.bio-card select, .editor-page textarea, .tag-picker textarea, .card.bio-card textarea { font: inherit; }
.editor-page button, .tag-picker button, .card.bio-card button, .editor-page a, .tag-picker a, .card.bio-card a, .editor-page input, .tag-picker input, .card.bio-card input, .editor-page select, .tag-picker select, .card.bio-card select, .editor-page textarea, .tag-picker textarea, .card.bio-card textarea { -webkit-tap-highlight-color: transparent; }
.editor-page button, .tag-picker button, .card.bio-card button, .editor-page select, .tag-picker select, .card.bio-card select { cursor: pointer; }
.editor-page button, .tag-picker button, .card.bio-card button { color: inherit; }
.editor-page a, .tag-picker a, .card.bio-card a { color: var(--blue); text-underline-offset: 3px; }
.editor-page button, .tag-picker button, .card.bio-card button, .editor-page a, .tag-picker a, .card.bio-card a, .editor-page input, .tag-picker input, .card.bio-card input, .editor-page select, .tag-picker select, .card.bio-card select, .editor-page textarea, .tag-picker textarea, .card.bio-card textarea { outline-offset: 4px; }
.editor-page :focus-visible, .tag-picker :focus-visible, .card.bio-card :focus-visible { outline: 3px solid #809aff; }
.editor-page button:disabled, .tag-picker button:disabled, .card.bio-card button:disabled { cursor: not-allowed; opacity: .6; }
.editor-page img, .tag-picker img, .card.bio-card img, .editor-page svg, .tag-picker svg, .card.bio-card svg { max-width: 100%; }
.editor-page h1, .tag-picker h1, .card.bio-card h1, .editor-page h2, .tag-picker h2, .card.bio-card h2, .editor-page h3, .tag-picker h3, .card.bio-card h3, .editor-page p, .tag-picker p, .card.bio-card p { margin-top: 0; }
.editor-page h1, .tag-picker h1, .card.bio-card h1, .editor-page h2, .tag-picker h2, .card.bio-card h2, .editor-page h3, .tag-picker h3, .card.bio-card h3 { letter-spacing: -.035em; line-height: 1.12; }
.editor-page p, .tag-picker p, .card.bio-card p { line-height: 1.65; }
.editor-page button, .tag-picker button, .card.bio-card button { border: 0; }
.editor-page ::selection, .tag-picker ::selection, .card.bio-card ::selection { background: #dfe6ff; color: #162b91; }
.editor-page .sr-only, .tag-picker .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.page.editor-page { padding-top: 20px; }
.editor-page .saved-toolbar { margin-bottom: -1px; }
.editor-page .editor-main > .editor-intro { padding-top: 16px; }
.editor-page .editor-public-note { margin: 0 0 12px;
  color: #85612e;
  font-size: 0.875rem; }
.editor-page { max-width: 1304px; margin: 0 auto; padding: 52px 42px 76px; }
.editor-page .section-heading { font-size: 25px; margin-bottom: 20px; }
.editor-page .button, .tag-picker .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border: 1px solid transparent; border-radius: 10px; padding: 11px 19px; font-size: 14px; font-weight: 700; line-height: 1.4; text-decoration: none; transition: background .15s ease, border-color .15s ease, transform .15s ease; }
.editor-page .button:hover, .tag-picker .button:hover { transform: translateY(-1px); }
.editor-page .button.primary, .tag-picker .button.primary { background: var(--blue); color: #fff; box-shadow: 0 3px 0 rgba(21,47,156,.15); }
.editor-page .button.primary:hover, .tag-picker .button.primary:hover { background: var(--blue-dark); }
.editor-page .button.secondary, .tag-picker .button.secondary { color: var(--ink); background: #fff; border-color: var(--line); }
.editor-page .button.secondary:hover, .tag-picker .button.secondary:hover { border-color: #abb6d2; background: #fafbff; }
.editor-page .button.ghost, .tag-picker .button.ghost { color: #506079; background: transparent; padding-left: 10px; padding-right: 10px; }
.editor-page .button.ghost:hover, .tag-picker .button.ghost:hover { background: #eaf0ff; color: var(--blue); }
.editor-page .button.danger, .tag-picker .button.danger { color: #ad2d29; background: #fff3f0; border-color: #f6d3cf; }
.editor-page .button.danger:hover, .tag-picker .button.danger:hover { background: #ffe5df; }
.editor-page .button.small, .tag-picker .button.small { min-height: 36px; padding: 7px 12px; font-size: 13px; border-radius: 8px; }
.editor-page .button.wide, .tag-picker .button.wide { width: 100%; }
.editor-page .icon-button { width: 35px; height: 35px; display: inline-grid; place-items: center; background: transparent; color: var(--muted); border-radius: 8px; font-size: 20px; }
.editor-page .icon-button:hover { background: var(--soft); color: var(--blue); }
.editor-page .panel { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 26px; }
.editor-page .panel + .panel { margin-top: 20px; }
.editor-page .panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; font-size: 19px; font-weight: 750; margin-bottom: 22px; letter-spacing: -.025em; }
.editor-page .panel-heading h2 { font-size: 20px; margin-bottom: 8px; }
.editor-page .panel-heading .panel-description { margin-bottom: 0; font-weight: 400; letter-spacing: normal; }
.editor-page .panel-heading > .button, .editor-page .panel-heading > .status-badge { flex-shrink: 0; }
.editor-page .section-heading h2 { font-size: 23px; margin-bottom: 10px; }
.editor-page .editor-main .section-heading { margin: 28px 0 18px; }
.editor-page .editor-main .section-heading h2 { font-size: 20px; }
.editor-page .section-heading .panel-description { margin-bottom: 0; }
.editor-page .section-heading .results-count { margin-top: 8px; margin-bottom: 0; }
.editor-page .panel-description { font-size: 14px; color: var(--muted); line-height: 1.6; margin-bottom: 22px; }
.editor-page .panel-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 23px; padding-top: 22px; border-top: 1px solid var(--line); }
.editor-page .editor-layout { display: grid; grid-template-columns: minmax(0,1.1fr) minmax(0,1fr); gap: 32px; align-items: start; }
.editor-page .editor-main, .editor-page .editor-aside { min-width: 0; }
.editor-page .editor-aside { position: sticky; top: 24px; }
.editor-page .preview-label { display: flex; align-items: center; justify-content: space-between; color: var(--muted); font-size: 12px; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; margin: 0 0 14px; }
.editor-page .preview-footer { color: var(--muted); text-align: center; font-size: 12px; line-height: 1.6; margin: 15px 0 24px; }
.editor-page .form-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }
.editor-page .field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; min-width: 0; }
.editor-page .form-grid .field { margin-bottom: 0; }
.editor-page .field-label, .tag-picker .field-label { font-size: 14px; font-weight: 650; line-height: 1.5; }
.editor-page .input, .tag-picker .input, .editor-page .textarea, .tag-picker .textarea, .editor-page .select, .tag-picker .select { display: block; width: 100%; border: 1px solid #d5dbe9; border-radius: 9px; background: #fff; padding: 11px 13px; color: var(--ink); min-height: 44px; font-size: 14px; line-height: 1.5; transition: border-color .15s, box-shadow .15s; }
.editor-page .input::placeholder, .tag-picker .input::placeholder, .editor-page .textarea::placeholder, .tag-picker .textarea::placeholder { color: #8791a8; }
.editor-page .input:focus, .tag-picker .input:focus, .editor-page .textarea:focus, .tag-picker .textarea:focus, .editor-page .select:focus, .tag-picker .select:focus { border-color: #718df7; box-shadow: 0 0 0 3px #234ee80d; }
.editor-page .textarea, .tag-picker .textarea { min-height: 100px; resize: vertical; }
.editor-page .select, .tag-picker .select { appearance: none; padding-right: 35px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='m4 6 4 4 4-4' fill='none' stroke='%23657087' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-position: right 12px center; background-repeat: no-repeat; }
.editor-page .help-text, .tag-picker .help-text { font-size: 12px; font-weight: 400; color: var(--muted); line-height: 1.6; margin: 0; }
.editor-page .help-inline, .tag-picker .help-inline { font-size: 12px; font-weight: 400; color: var(--muted); margin-left: 6px; }
.editor-page .form-error { font-size: 14px; color: #a12e28; line-height: 1.6; padding: 11px 13px; background: #fff3f0; border-left: 3px solid #c34b3b; border-radius: 5px; margin: 16px 0; }
.editor-page .form-error:empty { display: none; }
.editor-page .checkbox-field { display: flex; align-items: flex-start; gap: 11px; font-size: 14px; color: #526078; line-height: 1.6; margin: 19px 0; }
.editor-page .checkbox-field input { margin: 4px 0 0; width: 17px; height: 17px; accent-color: var(--blue); flex: 0 0 auto; }
.editor-page .section-label { display: block; color: #58647d; font-size: 12px; font-weight: 750; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px; }
.editor-page .saved-toolbar { position: relative; z-index: 1; display: flex; align-items: flex-end; gap: 8px; margin: 0 0 -1px; min-width: 0; }
.editor-page .bio-tabs { display: flex; align-items: flex-end; gap: 4px; overflow-x: auto; overflow-y: hidden; min-width: 0; padding: 3px 1px 0; scrollbar-width: none; overscroll-behavior-x: contain; scroll-padding-inline: 8px; }
.editor-page .bio-tabs::-webkit-scrollbar { display: none; }
.editor-page .bio-tab { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: flex-start; gap: 7px; height: 36px; min-width: 0; max-width: 230px; padding: 0 13px; border: 1px solid transparent; border-bottom-color: var(--line); border-radius: 9px 9px 0 0; background: #edf0f8; color: #63708b; text-align: left; white-space: nowrap; transition: color .15s, background .15s; }
.editor-page .bio-tab:hover { background: #e6ecfc; color: var(--blue); }
.editor-page .bio-tab.active { border-color: var(--line); border-bottom-color: #fff; box-shadow: inset 0 2px 0 #6681ee; background: #fff; color: var(--blue); }
.editor-page .bio-tab:focus-visible { outline-offset: -4px; }
.editor-page .bio-tab-name { display: block; min-width: 0; max-width: 175px; font-size: 14px; font-weight: 650; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.editor-page .bio-status { display: inline-flex; flex: 0 0 auto; color: var(--muted); font-size: 12px; font-weight: 550; line-height: 1.25; letter-spacing: .015em; }
.editor-page .bio-tab.published .bio-status { color: #26765c; }
.editor-page .new-bio-tab { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 5px; height: 32px; margin-bottom: 4px; padding: 0 9px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--blue); font-size: 14px; font-weight: 650; line-height: 1.25; white-space: nowrap; }
.editor-page .new-bio-tab:hover { background: #eaf0ff; border-color: #dce4fc; }
.editor-page .saved-toolbar + .editor-intro { border-top-left-radius: 0; }
.tag-picker { position: relative; margin-bottom: 20px; }
.tag-picker > .field-label { display: block; margin-bottom: 8px; }
.tag-picker > .help-text { margin-top: 8px; }
.editor-page #editor-tags + .tag-picker { margin-top: 23px; }
.tag-picker .tag-search { position: relative; }
.tag-picker .tag-suggestions { display: grid; gap: 3px; border: 1px solid var(--line); border-radius: 11px; padding: 6px; margin-top: 7px; max-height: 230px; overflow-y: auto; background: #fff; }
.tag-picker .tag-option { width: 100%; background: #fff; text-align: left; padding: 10px 11px; border-radius: 7px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.tag-picker .tag-option:hover, .tag-picker .tag-option:focus-visible { background: #edf1ff; }
.tag-picker .tag-option-name { font-size: 14px; font-weight: 600; }
.tag-picker .tag-option > span:first-child { flex: 1; min-width: 0; }
.tag-picker .tag-alias { display: block; font-size: 12px; color: var(--muted); font-weight: 400; line-height: 1.5; margin-top: 3px; }
.tag-picker .tag-category { color: var(--muted); font-size: 11px; white-space: nowrap; text-transform: capitalize; }
.editor-page .selected-tags { display: flex; flex-direction: column; gap: 16px; margin-top: 19px; }
.editor-page .tag-group { min-width: 0; }
.editor-page .tag-group + .tag-group { margin-top: 16px; }
.editor-page .tag-group > .selected-tags { display: flex; flex-direction: row; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
.editor-page .tag-group-label { width: 100%; color: #7b8498; font-size: 11px; font-weight: 750; letter-spacing: .085em; text-transform: uppercase; margin-bottom: 1px; }
.editor-page .tag-chip { display: inline-flex; align-items: center; gap: 7px; border: 1px solid #d8e1ff; border-radius: 7px; padding: 6px 8px 6px 10px; background: #eef2ff; color: #2548b2; font-size: 12px; font-weight: 600; line-height: 1.4; }
.editor-page .tag-chip.character { color: #76552a; background: #fff6e9; border-color: #efdfc3; }
.editor-page .tag-chip.pairing { color: #a14455; background: #fff0f2; border-color: #f5dce3; }
.editor-page .tag-chip.interest { color: #316c59; background: #edf7f1; border-color: #d3e9db; }
.editor-page .tag-remove { display: inline-grid; place-items: center; width: 20px; height: 20px; background: transparent; color: inherit; opacity: .65; border-radius: 4px; font-size: 17px; line-height: 1; }
.editor-page .tag-remove:hover { opacity: 1; background: #ffffffa0; }
.editor-page .tag-empty, .tag-picker .tag-empty { font-size: 13px; line-height: 1.65; color: var(--muted); margin: 0; padding: 10px 0 4px; }
.editor-page .template-options { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; margin: 20px 0 24px; }
.editor-page .template-option { display: flex; flex-direction: column; align-items: stretch; gap: 10px; border: 1px solid var(--line); border-radius: 11px; padding: 10px; background: #fff; text-align: center; }
.editor-page .template-option.selected { border-color: var(--blue); background: #f2f5ff; box-shadow: 0 0 0 1px var(--blue); }
.editor-page .template-option:hover { border-color: #8ca2ef; }
.editor-page .template-mini { height: 70px; background: #e3e9ff; border: 1px solid #d2dcff; border-radius: 5px; position: relative; overflow: hidden; }
.editor-page .template-mini::before { content: ""; position: absolute; top: 15px; left: 12px; width: 40%; height: 7px; border-radius: 2px; background: #6f89e6; box-shadow: 0 13px 0 #a9b9f1, 0 24px 0 #a9b9f1; }
.editor-page .template-mini::after { content: ""; position: absolute; right: 10px; bottom: 12px; width: 17px; height: 17px; background: #ef8b7a; border-radius: 50%; }
.editor-page .template-mini:is(.columns,[data-layout="columns"],[data-layout="Two columns"]) { background: linear-gradient(90deg,#5274e8 34%,#edf1ff 34%); }
.editor-page .template-mini:is(.columns,[data-layout="columns"],[data-layout="Two columns"])::before { left: 43%; width: 43%; height: 5px; top: 20px; box-shadow: 0 11px 0 #b6c4f4, 0 22px 0 #b6c4f4; }
.editor-page .template-mini:is(.columns,[data-layout="columns"],[data-layout="Two columns"])::after { left: 9px; top: 14px; width: 14px; height: 14px; background: #fff; }
.editor-page .template-mini:is(.minimal,[data-layout="minimal"],[data-layout="Spotlight"]) { background: #fff; }
.editor-page .template-mini:is(.minimal,[data-layout="minimal"],[data-layout="Spotlight"])::before { width: 65%; height: 6px; box-shadow: 0 16px 0 #dce2f1, 0 27px 0 #dce2f1; }
.editor-page .template-mini:is(.minimal,[data-layout="minimal"],[data-layout="Spotlight"])::after { height: 3px; width: 23px; top: 5px; right: auto; left: 12px; border-radius: 0; }
.editor-page .template-name { font-size: 12px; font-weight: 650; }
.editor-page .choice-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.editor-page .choice-row + .field-label { margin-top: 22px; }
.editor-page .choice-row + .help-text { margin-top: 15px; }
.editor-page .choice-button { min-height: 38px; display: inline-flex; gap: 7px; align-items: center; justify-content: center; padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; background: #fff; font-size: 12px; font-weight: 600; }
.editor-page .choice-button.selected { background: #edf1ff; color: #2244bd; border-color: #91a7f6; }
.editor-page .choice-button:hover { border-color: #9cacdc; }
.editor-page .palette-swatch { width: 13px; height: 13px; display: inline-block; border-radius: 50%; border: 1px solid #00000010; }
.editor-page .palette-swatch.Ocean { background: #234ee8; }
.editor-page .palette-swatch.Sunset { background: #c74a39; }
.editor-page .palette-swatch.Forest { background: #24664e; }
.editor-page .publish-panel { margin-top: 20px; }
.editor-page .publish-panel > h2 { font-size: 21px; }
.editor-page .publish-panel > .help-text { margin-top: 14px; }
.editor-page .publish-state { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.editor-page .status-badge { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line); border-radius: 30px; padding: 5px 10px; font-size: 11px; font-weight: 700; color: #68718a; background: #f6f7fb; }
.editor-page .status-badge.live { color: #216d52; background: #edf8f2; border-color: #cde9da; }
.editor-page .status-badge.live::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.editor-page .public-link { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 8px 10px 8px 13px; background: #f5f7fc; border: 1px solid #e3e7f2; border-radius: 8px; color: #4a5b8b; font-size: 13px; overflow-wrap: anywhere; line-height: 1.6; }
.editor-page .public-link .button { flex-shrink: 0; }
.editor-page .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 19px; padding-top: 19px; border-top: 1px solid var(--line); }
.editor-page .toggle-row h3, .editor-page .toggle-row strong { font-size: 14px; font-weight: 650; margin-bottom: 5px; }
.editor-page .toggle-row p { font-size: 12px; color: var(--muted); margin-bottom: 0; }
.editor-page .switch { position: relative; display: inline-flex; width: 42px; height: 25px; flex: 0 0 42px; }
.editor-page .switch input { position: absolute; width: 100%; height: 100%; opacity: 0; z-index: 1; margin: 0; cursor: pointer; }
.editor-page .switch-track { position: absolute; inset: 0; border-radius: 30px; background: #cbd2e3; transition: background .15s; }
.editor-page .switch-track::before { content: ""; position: absolute; width: 19px; height: 19px; background: #fff; border-radius: 50%; top: 3px; left: 3px; box-shadow: 0 1px 3px #18203b33; transition: transform .15s; }
.editor-page .switch input:checked + .switch-track { background: var(--blue); }
.editor-page .switch input:checked + .switch-track::before { transform: translateX(17px); }
.editor-page .switch input:focus-visible + .switch-track { outline: 3px solid #809aff; outline-offset: 3px; }
.editor-page input[role="switch"]:not(.switch input) { width: 38px; height: 22px; accent-color: var(--blue); }
.editor-page .notice { padding: 13px 15px; border: 1px solid #dce4fd; border-radius: 10px; background: #f1f4ff; color: #465a91; font-size: 13px; line-height: 1.65; margin: 15px 0; }
.editor-page .notice.warning { color: #85612e; border-color: #eddfc2; background: #fff9ed; }
.editor-page .notice.success { color: #2b6a52; border-color: #d2e8db; background: #eef8f2; }
.editor-page .notice p:last-child { margin-bottom: 0; }
.card.bio-card { --card-accent: #234ee8; --card-deep: #18358e; --card-soft: #edf1ff; --card-line: #d5defb; --card-text: #1d2a51; background: #fff; color: var(--card-text); border: 1px solid var(--card-line); border-radius: 16px; padding: 30px; position: relative; overflow: hidden; overflow-wrap: anywhere; min-width: 0; text-align: left; box-shadow: 0 5px 15px #192c6b08; }
.card.bio-card[data-palette="Sunset"] { --card-accent: #bd442f; --card-deep: #78352b; --card-soft: #fff0e8; --card-line: #efcfc1; --card-text: #4e2c2c; }
.card.bio-card[data-palette="Forest"] { --card-accent: #25664c; --card-deep: #214e3d; --card-soft: #eaf4ee; --card-line: #c7ded0; --card-text: #264335; }
.card.bio-card[data-font="Serif"] { font-family: Georgia, "Times New Roman", serif; }
.card.bio-card[data-font="Mono"] { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
.card.bio-card .card-topline { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative; z-index: 1; margin-bottom: 25px; }
.card.bio-card .card-monogram { width: 42px; height: 42px; border: 1px solid var(--card-line); background: #ffffff95; color: var(--card-accent); display: grid; place-items: center; border-radius: 12px; font-size: 22px; font-weight: 750; }
.card.bio-card .card-eyebrow { color: var(--card-accent); text-transform: uppercase; letter-spacing: .13em; font-weight: 750; font-size: 10px; line-height: 1.5; }
.card.bio-card .card-name { color: var(--card-deep); font-size: clamp(29px,3.3vw,40px); font-weight: 800; line-height: 1.12; letter-spacing: -.055em; margin: 0 0 7px; position: relative; z-index: 1; }
.card.bio-card .card-handle { font-size: 12px; color: var(--card-accent); line-height: 1.5; margin: 0 0 17px; position: relative; z-index: 1; }
.card.bio-card .card-identity { position: relative; z-index: 1; min-width: 0; }
.card.bio-card .card-note { font-size: 13px; line-height: 1.75; margin: 0 0 22px; white-space: pre-wrap; position: relative; z-index: 1; }
.card.bio-card .card-divider { border: 0; height: 1px; background: var(--card-line); margin: 23px 0; }
.card.bio-card .card-tags { display: flex; flex-direction: column; gap: 18px; position: relative; z-index: 1; }
.card.bio-card .card-tag-group { min-width: 0; }
.card.bio-card .card-group-label { display: block; color: var(--card-accent); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; font-weight: 800; line-height: 1.5; margin-bottom: 8px; }
.card.bio-card .card-tag-list { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.card.bio-card .card-tag { color: var(--card-deep); line-height: 1.45; font-weight: 600; text-decoration: underline; text-decoration-thickness: .08em; text-underline-offset: .2em; }
.card.bio-card .card-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; border-top: 1px solid var(--card-line); margin-top: 26px; padding-top: 16px; position: relative; z-index: 1; font-size: 9px; line-height: 1.5; color: var(--card-accent); }
.card.bio-card .card-open { font-size: 10px; display: inline-flex; align-items: center; gap: 5px; font-weight: 650; color: var(--card-accent); }
.card.bio-card .card-open::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.card.bio-card .card-decor { color: var(--card-accent); font-size: 52px; font-weight: 400; line-height: 1; }
.card.bio-card .card-empty { color: var(--card-accent); opacity: .8; font-size: 13px; line-height: 1.7; padding: 15px 0 20px; }
.card.bio-card:is([data-layout="poster"],[data-layout="Stacked"]) { background: var(--card-soft); border-top: 7px solid var(--card-accent); }
.card.bio-card:is([data-layout="poster"],[data-layout="Stacked"])::before { content: "✳"; position: absolute; top: -26px; right: -22px; color: var(--card-accent); opacity: .075; font-family: sans-serif; font-size: 220px; line-height: 1; }
.card.bio-card:is([data-layout="poster"],[data-layout="Stacked"]) .card-name { max-width: 87%; }
.card.bio-card:is([data-layout="poster"],[data-layout="Stacked"]) .card-tag-group:first-child .card-tag { color: var(--card-accent); }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) { padding-left: 88px; min-height: 360px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"])::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 60px; background: var(--card-accent); }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) .card-topline { margin-bottom: 20px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) .card-tags { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 19px 13px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) .card-tag-group:first-child { grid-column: 1 / -1; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) .card-name { font-size: clamp(26px,3vw,35px); }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) { padding: 34px; border-radius: 5px; background: #fff; }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) .card-topline { margin-bottom: 30px; }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) .card-monogram { background: transparent; width: 34px; height: 34px; border: 0; border-radius: 0; justify-content: start; }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) .card-name { font-size: clamp(28px,3vw,36px); font-weight: 650; }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) .card-tag { font-weight: 400; }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) .card-tag:not(:last-child)::after { content: ","; display: inline-block; }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) .card-tag-list { gap: 4px; }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) .card-group-label { color: #6d7485; }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) .card-footer { border-top: 3px solid var(--card-accent); }
.card.bio-card[data-font="Mono"] .card-name { letter-spacing: -.065em; font-size: 29px; }
.card.bio-card[data-font="Serif"] .card-name { letter-spacing: -.035em; }
.editor-page .empty-state { padding: 55px 25px; text-align: center; border: 1px dashed #cdd6ec; background: #ffffff60; border-radius: var(--radius); max-width: 100%; grid-column: 1/-1; }
.editor-page .empty-state h2, .editor-page .empty-state h3 { font-size: 22px; margin-bottom: 12px; }
.editor-page .empty-state p { max-width: 460px; color: var(--muted); margin: 0 auto 22px; font-size: 14px; }
.editor-page .empty-icon { font-size: 35px; color: var(--blue); margin-bottom: 20px; }
.editor-page.loading-state, .editor-page .loading-state { min-height: 55vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 20px; color: var(--muted); font-size: 14px; }
.editor-page .spinner { width: 28px; height: 28px; border: 3px solid #dbe2f7; border-top-color: var(--blue); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 1080px) {
.editor-page { padding-left: 28px; padding-right: 28px; }
.editor-page .editor-layout { gap: 23px; }
.editor-page .panel { padding: 22px; }
.card.bio-card { padding: 25px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) { padding-left: 74px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"])::before { width: 52px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"])::after { left: 17px; }
}
@media (max-width: 800px) {
.editor-page { padding: 35px 22px 54px; }
.editor-page .editor-layout { grid-template-columns: 1fr; gap: 30px; }
.editor-page .editor-aside { position: static; }
.editor-page .preview-stage .bio-card { max-width: 480px; margin: 0 auto; }
.editor-page .publish-panel { margin-top: 20px; }
.card.bio-card .card-name { font-size: 36px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) .card-name { font-size: 33px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) .card-tags { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 540px) {
.editor-page { padding: 30px 18px 48px; }
.editor-page .panel { padding: 20px; border-radius: 14px; }
.editor-page .panel-heading { font-size: 18px; }
.editor-page .panel-description { font-size: 13px; }
.editor-page .form-grid { grid-template-columns: 1fr; gap: 20px; }
.editor-page .form-grid .field:last-child { margin-bottom: 0; }
.editor-page .panel-footer > .button { flex: 1 1 auto; }
.editor-page .panel-footer { gap: 9px; }
.editor-page .button, .tag-picker .button { padding: 10px 15px; font-size: 13px; }
.editor-page .input, .tag-picker .input, .editor-page .textarea, .tag-picker .textarea, .editor-page .select, .tag-picker .select { font-size: 16px; }
.editor-page .saved-toolbar { gap: 5px; }
.editor-page .bio-tab { max-width: 190px; padding: 0 11px; }
.editor-page .bio-tab-name { max-width: 140px; }
.editor-page .new-bio-tab { padding: 0 7px; }
.editor-page .template-option { padding: 8px; gap: 8px; }
.editor-page .template-options { gap: 8px; }
.editor-page .template-mini { height: 60px; }
.editor-page .template-name { font-size: 11px; }
.editor-page .choice-button { padding-left: 10px; padding-right: 10px; }
.card.bio-card, .card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) { padding: 25px; border-radius: 13px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) { padding-left: 65px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"])::before { width: 43px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"])::after { left: 13px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) .card-tags { grid-template-columns: 1fr; }
.card.bio-card .card-name { font-size: 32px; }
.card.bio-card:is([data-layout="columns"],[data-layout="Two columns"]) .card-name { font-size: 28px; }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) .card-name { font-size: 30px; }
.card.bio-card .card-note { font-size: 12px; }
.card.bio-card .card-monogram { width: 35px; height: 35px; font-size: 19px; border-radius: 10px; }
.card.bio-card .card-topline { margin-bottom: 22px; }
.card.bio-card .card-tags { gap: 16px; }
}
.editor-page .save-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; margin-top: 16px; }
.editor-page .save-status { color: var(--muted); font-size: 0.8125rem; }
.editor-page .save-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-left: auto; }
@media (max-width: 540px) {
.editor-page .panel-heading { flex-wrap: wrap; gap: 12px; }
.editor-page .panel-heading h2 { font-size: 19px; }
.editor-page .panel-heading > .button { padding: 5px 0; min-height: 26px; }
.editor-page .save-actions { gap: 6px; }
.editor-page .save-actions .button { padding: 9px 11px; min-height: 39px; }
}
.editor-page .button.small, .tag-picker .button.small, .editor-page .field-label, .tag-picker .field-label, .editor-page .template-name, .editor-page .choice-button, .editor-page .tag-chip, .card.bio-card .card-tag, .card.bio-card .card-handle { font-size: 14px; }
.card.bio-card .card-note { font-size: 16px; }
.card.bio-card .card-eyebrow, .card.bio-card .card-group-label, .card.bio-card .card-footer, .card.bio-card .card-open, .editor-page .bio-status, .tag-picker .tag-category, .editor-page .tag-group-label, .editor-page .status-badge, .card.bio-card:is([data-layout="columns"],[data-layout="Two columns"])::after { font-size: 12px; }
@media (prefers-reduced-motion: reduce) {
.editor-page *, .tag-picker *, .card.bio-card * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}

/* Alpha DOM wrappers use lists where the MVP used unstyled divs. */
.card.bio-card { display: block; }
.card.bio-card .card-tag-group { font-size: inherit; }
.card.bio-card[data-layout="Spotlight"] .card-tag-group { font-size: inherit; }
.card.bio-card .card-tag-list, .editor-page ul.selected-tags, .tag-picker ul.tag-suggestions { padding-left: 0; list-style: none; }
.card.bio-card .card-tag-list { margin: 0; }
.editor-page .selected-tags > .tag-group { width: 100%; }
.editor-page .editing > .editor-intro { padding-top: 16px; border-top-left-radius: 0; }
.editor-page .bio-create > .editor-intro { border-top-left-radius: 0; }
.editor-page .bio-create { margin-bottom: 20px; }
.editor-page .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0; }
.editor-page .row > .input { flex: 1 1 160px; min-width: 0; width: auto; }
.tag-picker input { max-width: none; }
.tag-picker ul.tag-suggestions { display: grid; margin-bottom: 0; }
.tag-picker .tag-option { border: 0; font: inherit; color: var(--ink); }
.tag-picker .tag-option-name { font-size: 14px; }
.editor-page button[aria-pressed="true"] { outline: none; }
.editor-page button[aria-pressed="true"]:focus-visible { outline: 3px solid #809aff; }
.editor-page .public-link > a { min-width: 0; }
.editor-page .quiet { color: var(--muted); }
.card.bio-card[data-palette="Parchment"] { --card-accent: #85612e; --card-deep: #3b2f1e; --card-soft: #f6efdd; --card-line: #dacdb0; --card-text: #3b2f1e; }
.card.bio-card[data-palette="Midnight"] { --card-accent: #b4c6ff; --card-deep: #f1f5ff; --card-soft: #14213d; --card-line: #415273; --card-text: #f1f5ff; background: var(--card-soft); }
.card.bio-card[data-palette="Midnight"]:is([data-layout="minimal"],[data-layout="Spotlight"]) { background: var(--card-soft); }
.card.bio-card[data-palette="Sakura"] { --card-accent: #a14461; --card-deep: #5a1f33; --card-soft: #fde8ee; --card-line: #edc6d3; --card-text: #5a1f33; }
.card.bio-card[data-font="Sans"] { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.card.bio-card[data-font="Rounded"] { font-family: ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif; }
.editor-page .palette-swatch[data-palette="Ocean"] { background: #234ee8; }
.editor-page .palette-swatch[data-palette="Sunset"] { background: #c74a39; }
.editor-page .palette-swatch[data-palette="Parchment"] { background: #d9bd86; }
.editor-page .palette-swatch[data-palette="Midnight"] { background: #14213d; }
.editor-page .palette-swatch[data-palette="Sakura"] { background: #e6a1b7; }
.editor-page .palette-swatch[data-palette="Forest"] { background: #24664e; }
@media (max-width: 1080px) {
  body:has(.editor-page) > #bar, body:has(.editor-page) > #status { padding-inline: 28px; }
}
@media (max-width: 800px) {
  body:has(.editor-page) > #bar, body:has(.editor-page) > #status { padding-inline: 22px; }
}
@media (max-width: 540px) {
  body:has(.editor-page) > #bar, body:has(.editor-page) > #status { padding-inline: 18px; }
}
.mvp-editor-toast .toast { position: fixed; z-index: 100; bottom: 26px; left: 50%; transform: translateX(-50%); max-width: min(560px,calc(100vw - 32px)); display: flex; align-items: center; gap: 20px; padding: 15px 18px; border: 1px solid #294b7a; border-radius: 12px; color: #fff; background: #263a5e; box-shadow: 0 10px 40px #17254b26; font-size: 14px; line-height: 1.6; animation: toast-in .2s ease-out; }
.mvp-editor-toast .toast.error { background: #88352f; border-color: #a3443d; }
.mvp-editor-toast .toast.success { background: #245d49; border-color: #34785f; }
.mvp-editor-toast .toast-close { background: #ffffff18; color: #fff; width: 24px; height: 24px; border-radius: 5px; flex-shrink: 0; }
@keyframes toast-in { from { opacity: 0; bottom: 15px; } to { opacity: 1; bottom: 26px; } }
.mvp-editor-toast, .mvp-editor-toast * { box-sizing: border-box; }
.mvp-editor-toast button { border: 0; padding: 2px 6px; font: inherit; }
.mvp-editor-toast { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
@media (max-width: 540px) { .mvp-editor-toast .toast { bottom: 16px; padding: 12px 15px; font-size: 13px; } }
@media (prefers-reduced-motion: reduce) { .mvp-editor-toast .toast { animation: none; } }
`;
