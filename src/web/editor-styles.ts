/** Adapted from the editor and card styles on heyang-mvp (public/styles.css), scoped to the alpha pages. */
export const editorStyles = `
.editor-page {
  --editor-blue: #234ee8;
  --editor-blue-dark: #193bc0;
  --editor-ink: #18203b;
  --editor-muted: #657087;
  --editor-line: #dfe3ef;
  --editor-soft: #eef1fc;
  color: var(--editor-ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 1.25rem 0 3rem;
}
.editor-page *, .tag-picker *, .bio-card * { box-sizing: border-box; }
.editor-page [hidden] { display: none !important; }
.tag-picker [hidden] { display: none !important; }
.editor-page :is(h1, h2, h3, p) { margin-top: 0; }
.editor-page :is(h1, h2, h3) { letter-spacing: -.035em; line-height: 1.2; }
.editor-page h2 { font-size: 1.25rem; margin-bottom: .65rem; }
.editor-page h3 { font-size: 1rem; }
.editor-page a { color: var(--editor-blue); text-underline-offset: 3px; }
.editor-page :is(button, input, select) { font: inherit; }
.editor-page button { border: 0; color: inherit; }
.editor-page :is(button, a, input, select):focus-visible, .tag-picker :is(button, input):focus-visible { outline: 3px solid #809aff; outline-offset: 3px; }
.editor-page button:disabled, .tag-picker button:disabled { opacity: .6; cursor: not-allowed; }
.editor-page button[aria-pressed="true"] { outline: none; }
.editor-page button[aria-pressed="true"]:focus-visible { outline: 3px solid #809aff; }
.editor-page .editor-layout { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr); gap: 1.6rem; align-items: start; }
.editor-page :is(.editor-main, .editor-aside) { min-width: 0; }
.editor-page .editor-aside { position: sticky; top: 3rem; }
.editor-page .panel { background: #fff; border: 1px solid var(--editor-line); border-radius: 1rem; padding: 1.4rem; }
.editor-page .panel + .panel { margin-top: 1.25rem; }
.editor-page .editing > .panel + .panel { margin-top: 1.25rem; }
.editor-page .panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
.editor-page .panel-heading h2 { margin-bottom: .5rem; }
.editor-page .panel-heading > .button { flex-shrink: 0; }
.editor-page .panel-description { font-size: .875rem; color: var(--editor-muted); line-height: 1.6; }
.editor-page .panel-heading .panel-description { margin-bottom: 0; }
.editor-page .section-heading { margin: 1.75rem 0 1rem; }
.editor-page .section-heading h2 { font-size: 1.2rem; }
.editor-page .section-heading .panel-description { margin-bottom: 0; }
.editor-page .button { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 2.75rem; padding: .65rem 1rem; border: 1px solid transparent; border-radius: .6rem; font-size: .875rem; font-weight: 700; line-height: 1.4; text-decoration: none; cursor: pointer; }
.editor-page .button.primary { background: var(--editor-blue); color: #fff; box-shadow: 0 3px 0 #152f9c20; }
.editor-page .button.primary:hover { background: var(--editor-blue-dark); }
.editor-page .button.secondary { color: var(--editor-ink); background: #fff; border-color: var(--editor-line); }
.editor-page .button.secondary:hover { background: #fafbff; border-color: #abb6d2; }
.editor-page .button.ghost { color: #506079; background: transparent; padding-inline: .6rem; }
.editor-page .button.ghost:hover { color: var(--editor-blue); background: #eaf0ff; }
.editor-page .button.danger { color: #ad2d29; background: #fff3f0; border-color: #f6d3cf; }
.editor-page .button.small { min-height: 2.25rem; padding: .4rem .7rem; border-radius: .5rem; }
.editor-page .button.wide { width: 100%; }
.editor-page .row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin: .5rem 0; }
.editor-page .row > .input { flex: 1 1 10rem; min-width: 0; width: auto; }
.editor-page .bio-create { margin: 0 0 1.25rem; }
.editor-page .bio-create > .editor-intro { border-top-left-radius: 0; }
.editor-page .editing > .editor-intro { border-top-left-radius: 0; }
.editor-page .field { display: flex; flex-direction: column; gap: .5rem; margin-bottom: 1.25rem; min-width: 0; }
.editor-page .field-label { display: block; font-size: .875rem; font-weight: 650; line-height: 1.5; margin-bottom: .5rem; }
.editor-page .field > .field-label { margin-bottom: 0; }
.editor-page :is(.input, .select) { display: block; width: 100%; min-height: 2.75rem; border: 1px solid #d5dbe9; border-radius: .55rem; background: #fff; padding: .65rem .8rem; color: var(--editor-ink); font-size: .875rem; line-height: 1.5; }
.editor-page .input::placeholder { color: #8791a8; }
.editor-page .input:focus { border-color: #718df7; box-shadow: 0 0 0 3px #234ee80d; }
.editor-page .help-text { color: var(--editor-muted); font-size: .8rem; font-weight: 400; line-height: 1.6; margin: 0; }
.editor-page .help-inline { color: var(--editor-muted); font-size: .75rem; font-weight: 400; margin-left: .4rem; }
.editor-page .quiet { color: var(--editor-muted); }
.editor-page .editor-public-note { color: #85612e; font-size: .875rem; margin: 0 0 .75rem; }
.editor-page .saved-toolbar { position: relative; z-index: 1; display: flex; align-items: flex-end; gap: .5rem; margin-bottom: -1px; min-width: 0; }
.editor-page .bio-tabs { display: flex; align-items: flex-end; gap: .25rem; overflow-x: auto; overflow-y: hidden; min-width: 0; padding: .2rem 1px 0; scrollbar-width: thin; overscroll-behavior-x: contain; }
.editor-page .bio-tab { display: inline-flex; flex: 0 0 auto; align-items: center; gap: .45rem; min-height: 2.4rem; max-width: 14rem; padding: .45rem .8rem; border: 1px solid transparent; border-bottom-color: var(--editor-line); border-radius: .55rem .55rem 0 0; background: #edf0f8; color: #63708b; text-align: left; white-space: nowrap; }
.editor-page .bio-tab:hover { background: #e6ecfc; color: var(--editor-blue); }
.editor-page .bio-tab.active, .editor-page .bio-tab[aria-pressed="true"] { border-color: var(--editor-line); border-bottom-color: #fff; box-shadow: inset 0 2px 0 #6681ee; background: #fff; color: var(--editor-blue); }
.editor-page .bio-tab:focus-visible { outline-offset: -4px; }
.editor-page .bio-tab-name { display: block; min-width: 0; max-width: 10rem; font-size: .875rem; font-weight: 650; overflow: hidden; text-overflow: ellipsis; }
.editor-page .bio-status { flex: 0 0 auto; color: var(--editor-muted); font-size: .75rem; }
.editor-page .bio-tab.published .bio-status { color: #26765c; }
.editor-page .new-bio-tab { flex: 0 0 auto; min-height: 2.25rem; padding: .4rem .55rem; margin-bottom: .15rem; border-radius: .5rem; background: transparent; color: var(--editor-blue); font-size: .875rem; font-weight: 650; white-space: nowrap; }
.editor-page .new-bio-tab:hover { background: #eaf0ff; }
.editor-page .saved-toolbar + .editor-intro { border-top-left-radius: 0; }
.editor-page .tag-group + .tag-group { margin-top: 1rem; }
.editor-page .tag-group-label { color: #657087; font-size: .75rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; margin-bottom: .5rem; }
.editor-page .selected-tags { display: flex; flex-wrap: wrap; gap: .45rem; margin: .5rem 0; padding: 0; list-style: none; }
.editor-page .selected-tags > .tag-group { width: 100%; }
.editor-page .tag-chip { display: inline-flex; align-items: center; gap: .4rem; border: 1px solid #d8e1ff; border-radius: .45rem; padding: .35rem .5rem .35rem .6rem; background: #eef2ff; color: #2548b2; font-size: .875rem; font-weight: 600; line-height: 1.4; }
.editor-page .tag-chip.character { color: #76552a; background: #fff6e9; border-color: #efdfc3; }
.editor-page .tag-chip.pairing { color: #a14455; background: #fff0f2; border-color: #f5dce3; }
.editor-page .tag-chip.interest { color: #316c59; background: #edf7f1; border-color: #d3e9db; }
.editor-page .tag-remove { display: inline-grid; place-items: center; width: 1.5rem; height: 1.5rem; padding: 0; background: transparent; color: inherit; border-radius: .25rem; font-size: 1.1rem; line-height: 1; }
.editor-page .tag-remove:hover { background: #ffffffa0; }
.editor-page .tag-empty { font-size: .875rem; line-height: 1.65; color: var(--editor-muted); padding: .6rem 0 .25rem; }
.tag-picker { --picker-ink: #18203b; --picker-muted: #657087; position: relative; margin: 1.25rem 0; color: var(--picker-ink); }
.tag-picker > label { display: block; margin-bottom: .5rem; font-size: .875rem; font-weight: 650; }
.tag-picker input { display: block; width: 100%; max-width: none; min-height: 2.75rem; border: 1px solid #d5dbe9; border-radius: .55rem; background: #fff; padding: .65rem .8rem; color: var(--picker-ink); font: inherit; font-size: .875rem; line-height: 1.5; }
.tag-picker .help-text { color: var(--picker-muted); font-size: .8rem; margin-top: .5rem; line-height: 1.6; }
.tag-picker .tag-empty { color: var(--picker-muted); font-size: .875rem; line-height: 1.6; padding: .6rem; }
.tag-picker :is(.suggestions, .tag-suggestions) { display: grid; gap: .2rem; list-style: none; margin: .45rem 0 0; padding: .35rem; border: 1px solid #dfe3ef; border-radius: .7rem; max-height: 15rem; overflow-y: auto; background: #fff; }
.tag-picker :is(.suggestions, .tag-suggestions):empty { display: none; }
.tag-picker .suggestions > li { min-width: 0; }
.tag-picker .suggestions > li.quiet { color: var(--picker-muted); font-size: .875rem; padding: .6rem; }
.tag-picker :is(.tag-option, .suggestions > li > button) { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; text-align: left; padding: .65rem .7rem; border: 0; border-radius: .45rem; background: #fff; color: var(--picker-ink); font: inherit; font-size: .875rem; cursor: pointer; }
.tag-picker :is(.tag-option, .suggestions > li > button):hover { background: #edf1ff; }
.tag-picker .tag-option-name { font-weight: 600; }
.tag-picker .tag-alias { display: block; color: var(--picker-muted); font-size: .8rem; font-weight: 400; line-height: 1.5; margin-top: .2rem; }
.tag-picker .tag-category { color: var(--picker-muted); font-size: .75rem; text-transform: capitalize; }
.editor-page .template-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6rem; margin: 1rem 0 1.5rem; }
.editor-page .template-option { display: flex; flex-direction: column; align-items: stretch; gap: .6rem; min-width: 0; border: 1px solid var(--editor-line); border-radius: .7rem; padding: .6rem; background: #fff; text-align: center; }
.editor-page .template-option.selected, .editor-page .template-option[aria-pressed="true"] { border-color: var(--editor-blue); background: #f2f5ff; box-shadow: 0 0 0 1px var(--editor-blue); }
.editor-page .template-option:hover { border-color: #8ca2ef; }
.editor-page .template-mini { display: block; height: 4.4rem; background: #e3e9ff; border: 1px solid #d2dcff; border-radius: .3rem; position: relative; overflow: hidden; }
.editor-page .template-mini::before { content: ""; position: absolute; top: 1rem; left: .75rem; width: 40%; height: .4rem; border-radius: 2px; background: #6f89e6; box-shadow: 0 .8rem 0 #a9b9f1, 0 1.5rem 0 #a9b9f1; }
.editor-page .template-mini::after { content: ""; position: absolute; right: .6rem; bottom: .75rem; width: 1rem; height: 1rem; background: #ef8b7a; border-radius: 50%; }
.editor-page .template-mini[data-layout="Two columns"] { background: linear-gradient(90deg, #5274e8 34%, #edf1ff 34%); }
.editor-page .template-mini[data-layout="Two columns"]::before { left: 43%; width: 43%; height: .3rem; top: 1.25rem; box-shadow: 0 .7rem 0 #b6c4f4, 0 1.4rem 0 #b6c4f4; }
.editor-page .template-mini[data-layout="Two columns"]::after { left: .55rem; top: .85rem; width: .8rem; height: .8rem; background: #fff; }
.editor-page .template-mini[data-layout="Spotlight"] { background: #fff; border-top: 4px solid #6f89e6; }
.editor-page .template-mini[data-layout="Spotlight"]::before { width: 65%; height: .6rem; box-shadow: 0 1rem 0 #dce2f1, 0 1.7rem 0 #dce2f1; }
.editor-page .template-name { font-size: .875rem; font-weight: 650; line-height: 1.35; overflow-wrap: anywhere; }
.editor-page .choice-row { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }
.editor-page .choice-row + .field-label { margin-top: 1.3rem; }
.editor-page .choice-row + .help-text { margin-top: 1rem; }
.editor-page .choice-button { min-height: 2.4rem; display: inline-flex; gap: .4rem; align-items: center; justify-content: center; padding: .5rem .7rem; border: 1px solid var(--editor-line); border-radius: .5rem; background: #fff; font-size: .875rem; font-weight: 600; }
.editor-page .choice-button.selected, .editor-page .choice-button[aria-pressed="true"] { background: #edf1ff; color: #2244bd; border-color: #91a7f6; }
.editor-page .choice-button:hover { border-color: #9cacdc; }
.editor-page .palette-swatch { width: .85rem; height: .85rem; flex: 0 0 auto; display: inline-block; border-radius: 50%; border: 1px solid #0002; }
.editor-page .palette-swatch[data-palette="Parchment"] { background: #d9bd86; }
.editor-page .palette-swatch[data-palette="Midnight"] { background: #14213d; }
.editor-page .palette-swatch[data-palette="Sakura"] { background: #e6a1b7; }
.editor-page .palette-swatch[data-palette="Forest"] { background: #24664e; }
.editor-page .save-bar { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem .75rem; margin-top: 1rem; }
.editor-page .save-status { color: var(--editor-muted); font-size: .8rem; }
.editor-page .save-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: .5rem; margin-left: auto; }
.editor-page .preview-label { display: flex; align-items: center; justify-content: space-between; color: var(--editor-muted); font-size: .75rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; margin: 0 0 .85rem; }
.editor-page .preview-stage { min-width: 0; }
.editor-page .preview-footer { color: var(--editor-muted); text-align: center; font-size: .8rem; line-height: 1.6; margin: 1rem 0 1.5rem; }
.editor-page .publish-panel { margin-top: 1.25rem; }
.editor-page .publish-state { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem; margin-bottom: 1rem; }
.editor-page .publish-state h2 { margin: 0; }
.editor-page .status-badge { display: inline-flex; align-items: center; gap: .4rem; border: 1px solid var(--editor-line); border-radius: 2rem; padding: .3rem .6rem; font-size: .75rem; font-weight: 700; color: #68718a; background: #f6f7fb; }
.editor-page .status-badge.live { color: #216d52; background: #edf8f2; border-color: #cde9da; }
.editor-page .status-badge.live::before { content: ""; width: .35rem; height: .35rem; border-radius: 50%; background: currentColor; }
.editor-page .public-link { display: flex; align-items: center; justify-content: space-between; gap: .75rem; width: 100%; padding: .6rem .7rem; background: #f5f7fc; border: 1px solid #e3e7f2; border-radius: .5rem; color: #4a5b8b; font-size: .8rem; overflow-wrap: anywhere; line-height: 1.6; }
.editor-page .public-link > a { min-width: 0; }
.editor-page .public-link .button { flex-shrink: 0; }
.editor-page .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 1.2rem; padding-top: 1.2rem; border-top: 1px solid var(--editor-line); }
.editor-page .toggle-row :is(h3, strong, label) { font-size: .875rem; font-weight: 650; margin-bottom: .3rem; }
.editor-page .toggle-row p { font-size: .8rem; color: var(--editor-muted); margin-bottom: 0; }
.editor-page .toggle-row input { flex: 0 0 auto; width: 1.25rem; height: 1.25rem; accent-color: var(--editor-blue); }
.editor-page .switch { position: relative; display: inline-flex; width: 2.65rem; height: 1.6rem; flex: 0 0 2.65rem; }
.editor-page .switch input { position: absolute; width: 100%; height: 100%; opacity: 0; z-index: 1; margin: 0; cursor: pointer; }
.editor-page .switch-track { position: absolute; inset: 0; border-radius: 2rem; background: #cbd2e3; }
.editor-page .switch-track::before { content: ""; position: absolute; width: 1.2rem; height: 1.2rem; background: #fff; border-radius: 50%; top: .2rem; left: .2rem; box-shadow: 0 1px 3px #18203b33; }
.editor-page .switch input:checked + .switch-track { background: var(--editor-blue); }
.editor-page .switch input:checked + .switch-track::before { transform: translateX(1.05rem); }
.editor-page .switch input:focus-visible + .switch-track { outline: 3px solid #809aff; outline-offset: 3px; }
.editor-page .notice { padding: .8rem .9rem; border: 1px solid #dce4fd; border-radius: .6rem; background: #f1f4ff; color: #465a91; font-size: .8rem; line-height: 1.65; margin: 1rem 0; }
.editor-page .notice.warning { color: #85612e; border-color: #eddfc2; background: #fff9ed; }
.editor-page .notice.success { color: #2b6a52; border-color: #d2e8db; background: #eef8f2; }
.editor-page .empty-state { padding: 2.5rem 1.5rem; text-align: center; border: 1px dashed #cdd6ec; background: #f6f7fb; border-radius: 1rem; }
.editor-page .empty-state p { max-width: 30rem; color: var(--editor-muted); font-size: .875rem; line-height: 1.65; margin: 0 auto 1.25rem; }
.editor-page .empty-icon { font-size: 2rem; color: var(--editor-blue); margin-bottom: 1rem; }
.editor-page .loading-state { min-height: 15rem; display: grid; place-items: center; color: var(--editor-muted); }
.card.bio-card {
  --card-accent: #85612e;
  --card-deep: #3b2f1e;
  --card-soft: #f6efdd;
  --card-line: #dacdb0;
  --card-text: #3b2f1e;
  display: block;
  min-width: 0;
  background: var(--card-soft);
  color: var(--card-text);
  border: 1px solid var(--card-line);
  border-radius: 1rem;
  padding: 1.8rem;
  position: relative;
  overflow: hidden;
  overflow-wrap: anywhere;
  text-align: left;
  box-shadow: 0 5px 15px #192c6b08;
}
.card.bio-card[data-palette="Midnight"] { --card-accent: #b4c6ff; --card-deep: #f1f5ff; --card-soft: #14213d; --card-line: #415273; --card-text: #f1f5ff; }
.card.bio-card[data-palette="Sakura"] { --card-accent: #a14461; --card-deep: #5a1f33; --card-soft: #fde8ee; --card-line: #edc6d3; --card-text: #5a1f33; }
.card.bio-card[data-palette="Forest"] { --card-accent: #25664c; --card-deep: #214e3d; --card-soft: #e6f1e4; --card-line: #bdd4bf; --card-text: #1f3d27; }
.card.bio-card[data-font="Serif"] { font-family: Georgia, "Times New Roman", serif; }
.card.bio-card[data-font="Sans"] { font-family: system-ui, "Helvetica Neue", Arial, sans-serif; }
.card.bio-card[data-font="Rounded"] { font-family: ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif; }
.card.bio-card[data-font="Mono"] { font-family: ui-monospace, Menlo, Consolas, monospace; }
.bio-card .card-topline { display: flex; align-items: center; justify-content: space-between; gap: .75rem; position: relative; z-index: 1; margin-bottom: 1.5rem; }
.bio-card .card-monogram { width: 2.6rem; height: 2.6rem; border: 1px solid var(--card-line); background: var(--card-soft); color: var(--card-accent); display: grid; place-items: center; border-radius: .75rem; font-size: 1.4rem; font-weight: 750; }
.bio-card .card-eyebrow { color: var(--card-accent); text-transform: uppercase; letter-spacing: .12em; font-weight: 750; font-size: .75rem; line-height: 1.5; }
.bio-card .card-identity { position: relative; z-index: 1; min-width: 0; }
.card.bio-card .card-name { color: var(--card-deep); font-size: clamp(1.6rem, 3vw, 2.3rem); font-weight: 800; line-height: 1.15; letter-spacing: -.045em; margin: 0 0 .5rem; }
.card.bio-card .card-handle { font-size: .875rem; font-weight: 600; color: var(--card-accent); line-height: 1.5; margin: 0 0 1rem; position: relative; z-index: 1; }
.bio-card .card-note { font-size: 1rem; line-height: 1.75; margin: 0 0 1.3rem; white-space: pre-wrap; position: relative; z-index: 1; }
.bio-card .card-divider { border: 0; height: 1px; background: var(--card-line); margin: 1.4rem 0; }
.bio-card .card-tags { display: flex; flex-direction: column; gap: 1.1rem; position: relative; z-index: 1; }
.card.bio-card .card-tag-group { min-width: 0; font-size: 1rem; }
.card.bio-card .card-group-label { display: block; color: var(--card-accent); font-size: .75rem; letter-spacing: .1em; text-transform: uppercase; font-weight: 800; line-height: 1.5; margin: 0 0 .5rem; }
.bio-card .card-tag-list { display: flex; flex-wrap: wrap; gap: .4rem .85rem; margin: 0; padding: 0; list-style: none; }
.bio-card .card-tag { color: var(--card-deep); font-size: .875rem; line-height: 1.5; font-weight: 600; text-decoration: underline; text-decoration-thickness: .08em; text-underline-offset: .2em; }
.bio-card .card-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .6rem; border-top: 1px solid var(--card-line); margin-top: 1.6rem; padding-top: 1rem; position: relative; z-index: 1; font-size: .75rem; line-height: 1.5; color: var(--card-accent); }
.bio-card .card-decor { color: var(--card-accent); font-size: 2.6rem; line-height: 1; }
.bio-card .card-empty { color: var(--card-accent); font-size: .875rem; line-height: 1.7; padding: 1rem 0 1.25rem; }
.card.bio-card[data-layout="Stacked"] { border-top: 6px solid var(--card-accent); }
.card.bio-card[data-layout="Stacked"]::before { content: "✳"; position: absolute; top: -1.5rem; right: -1.3rem; color: var(--card-accent); opacity: .075; font-family: sans-serif; font-size: 13rem; line-height: 1; }
.card.bio-card[data-layout="Two columns"] { padding-left: 4.8rem; min-height: 20rem; }
.card.bio-card[data-layout="Two columns"]::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3rem; background: var(--card-accent); }
.card.bio-card[data-layout="Two columns"] .card-tags { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.2rem .8rem; }
.card.bio-card[data-layout="Two columns"] .card-tag-group:first-child { grid-column: 1 / -1; }
.card.bio-card[data-layout="Spotlight"] { border-radius: .4rem; }
.card.bio-card[data-layout="Spotlight"] .card-tag-group:first-child .card-tag { font-size: 1.3rem; font-weight: 750; }
.card.bio-card[data-layout="Spotlight"] .card-footer { border-top: 3px solid var(--card-accent); }
.card.bio-card[data-font="Mono"] .card-name { letter-spacing: -.06em; font-size: 1.8rem; }
.card.bio-card[data-font="Serif"] .card-name { letter-spacing: -.03em; }
@media (max-width: 800px) {
  .editor-page .editor-layout { grid-template-columns: 1fr; gap: 1.8rem; }
  .editor-page .editor-aside { position: static; }
  .editor-page .preview-stage .bio-card { max-width: 32rem; margin-inline: auto; }
}
@media (max-width: 540px) {
  .editor-page .panel { padding: 1.1rem; border-radius: .85rem; }
  .editor-page .panel-heading { flex-wrap: wrap; gap: .75rem; }
  .editor-page .panel-heading > .button { padding: .3rem 0; min-height: 1.7rem; }
  .editor-page .input, .tag-picker input { font-size: 1rem; }
  .editor-page .saved-toolbar { gap: .3rem; }
  .editor-page .bio-tab { max-width: 11rem; padding-inline: .6rem; }
  .editor-page .bio-tab-name { max-width: 7rem; }
  .editor-page .new-bio-tab { padding-inline: .4rem; }
  .editor-page .template-options { gap: .5rem; }
  .editor-page .template-option { padding: .45rem; }
  .editor-page .template-mini { height: 3.75rem; }
  .editor-page .template-name { font-size: .8rem; }
  .editor-page .choice-button { padding-inline: .6rem; }
  .editor-page .save-actions { gap: .4rem; }
  .editor-page .save-actions .button { padding: .55rem .65rem; min-height: 2.5rem; }
  .card.bio-card { padding: 1.5rem; }
  .card.bio-card[data-layout="Two columns"] { padding-left: 4rem; }
  .card.bio-card[data-layout="Two columns"]::before { width: 2.5rem; }
  .card.bio-card[data-layout="Two columns"] .card-tags { grid-template-columns: 1fr; }
  .card.bio-card .card-name { font-size: 1.85rem; }
  .bio-card .card-topline { gap: .5rem; }
  .bio-card .card-eyebrow { font-size: .65rem; }
}
@media (prefers-reduced-motion: reduce) {
  .editor-page *, .editor-page *::before, .editor-page *::after, .bio-card *, .tag-picker * { scroll-behavior: auto; transition: none; animation: none; }
}
`;
