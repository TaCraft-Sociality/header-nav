/*
 * The editor's styles (/header-nav and the mega menu builder).
 *
 * 🚨 Here, not in less/forum.less: only an admin ever opens the editor, so its
 * styles arrive with its lazy chunk instead of riding in every visitor's CSS.
 * Colours are the forum's own custom properties, as everywhere else.
 */
export default `
.HeaderNavEditor {
  max-width: 920px;
  padding-top: 24px;
  padding-bottom: 60px;
}
.HeaderNavEditor h1 {
  margin: 0 0 6px;
  font-size: 1.6rem;
}
.HeaderNavEditor-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 14px 0 18px;
  font-size: 0.85rem;
  color: var(--muted-color);
}
.HeaderNavEditor-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.HeaderNavEditor-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--control-bg);
  border-radius: var(--border-radius);
  background: var(--body-bg);
}
.HeaderNavEditor-row.is-hidden .HeaderNavEditor-preview,
.HeaderNavEditor-row.is-hidden .HeaderNavEditor-fields {
  opacity: 0.55;
}
.HeaderNavEditor-row.is-missing {
  border-style: dashed;
}
.HeaderNavEditor-row.sortable-ghost {
  opacity: 0.4;
}
.HeaderNavEditor-handle {
  flex: 0 0 auto;
  padding: 8px 4px;
  color: var(--muted-color);
  cursor: grab;
  touch-action: none;
}
.HeaderNavEditor-handle:active {
  cursor: grabbing;
}
.HeaderNavEditor-preview {
  flex: 0 0 32px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: var(--primary-color);
}
.HeaderNavEditor-fields {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.HeaderNavEditor-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.HeaderNavEditor-line .FormControl {
  flex: 1 1 180px;
  min-width: 0;
}
.HeaderNavEditor-line .HeaderNavEditor-icon {
  flex: 0 1 200px;
}
.HeaderNavEditor-line .FormControl.is-invalid {
  border-color: #d83e3e;
}
.HeaderNavEditor-newTab {
  flex: 0 0 auto;
  white-space: nowrap;
  font-size: 0.9rem;
}
.HeaderNavEditor-note {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted-color);
}
.HeaderNavEditor-note.is-error {
  color: #d83e3e;
}
.HeaderNavEditor-place {
  flex: 0 0 auto;
  display: inline-flex;
}
.HeaderNavEditor-remove {
  flex: 0 0 auto;
}
.HeaderNavEditor-add {
  margin: 12px 0 24px;
}
.HeaderNavEditor-direct .FormControl {
  max-width: 100px;
}
.HeaderNavEditor-direct + .HeaderNavEditor-direct {
  margin-top: 22px;
}
.HeaderNavEditor-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
}
.HeaderNavEditor-unsaved {
  font-size: 0.85rem;
  color: var(--muted-color);
}
@media (max-width: 767.98px) {
  .HeaderNavEditor-row {
    flex-wrap: wrap;
  }
  .HeaderNavEditor-place {
    width: 100%;
    justify-content: flex-end;
  }
}
.HeaderNavEditor-add {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.HeaderNavEditor-add .Button input {
  display: none;
}
.HeaderNavEditor-mega {
  flex: 0 0 auto;
}
.HeaderNavEditor-row--mega {
  border-left: 3px solid var(--primary-color);
}
.HeaderNavEditor--mega {
  max-width: 1240px;
}
.MegaBuilder-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.MegaBuilder-bar h2 {
  flex: 1 1 200px;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 1.4rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.MegaBuilder-enabled {
  margin-right: 8px;
}
.MegaBuilder-preview {
  margin-bottom: 18px;
  padding: 14px;
  border-radius: 12px;
  background: var(--control-bg);
}
.MegaBuilder-devices {
  margin-bottom: 12px;
}
.MegaBuilder-stage .HeaderMega-panel {
  position: relative;
  z-index: auto;
  width: min(var(--hm-width), 100%);
  max-height: none;
  margin: 0 auto;
}
/* Outside the header the forum's link colour would reach the preview. */
.MegaBuilder-stage .HeaderMega-panel a:not(.Button),
.MegaBuilder-stage .HeaderMega-link {
  color: var(--text-color);
}
.MegaBuilder-stage--phone {
  width: 375px;
  max-width: 100%;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 8px 12px;
  border: 1px solid var(--control-bg);
  border-radius: 20px;
  background: var(--body-bg);
}
.MegaBuilder-stage--phone .HeaderMega-panel {
  width: auto;
}
.MegaBuilder-fakeTrigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 4px;
  font-weight: 600;
}
.MegaBuilder-fakeTrigger span {
  flex: 1;
}
.MegaBuilder-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  overflow-x: auto;
  border-bottom: 1px solid var(--control-bg);
}
.MegaBuilder-tab {
  margin-bottom: -1px;
  padding: 10px 14px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
  color: var(--muted-color);
  cursor: pointer;
}
.MegaBuilder-tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}
.MegaBuilder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  align-items: end;
  gap: 12px 16px;
}
.MegaBuilder-field,
.MegaBuilder-aud > label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  font-size: 0.85rem;
  color: var(--muted-color);
}
.MegaBuilder-field > span,
.MegaBuilder-aud > label > span {
  font-weight: 600;
}
.MegaBuilder-field output {
  font-weight: normal;
}
.MegaBuilder .FormControl.is-invalid,
.MegaBuilder-groups.is-invalid {
  border-color: #d83e3e;
}
.MegaBuilder-color {
  display: flex;
  align-items: center;
  gap: 6px;
}
.MegaBuilder-color input[type='color'] {
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  background: none;
}
.MegaBuilder-check {
  align-self: center;
  font-size: 0.9rem;
}
.MegaBuilder-show,
.MegaBuilder-block {
  min-width: 0;
  margin: 0 0 16px;
  padding: 10px 14px 14px;
  border: 1px solid var(--control-bg);
  border-radius: 10px;
}
.MegaBuilder-show {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
}
.MegaBuilder legend {
  padding: 0 6px;
  font-size: 0.9rem;
  font-weight: 700;
}
.MegaBuilder-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}
.MegaBuilder-section {
  --hm-accent: var(--primary-color);
  padding: 12px;
  border: 1px solid var(--control-bg);
  border-left: 4px solid var(--hm-accent);
  border-radius: 10px;
  background: var(--body-bg);
}
.MegaBuilder-section.sortable-ghost,
.MegaBuilder-link.sortable-ghost {
  opacity: 0.4;
}
.MegaBuilder-sectionHead,
.MegaBuilder-linkLine {
  display: flex;
  align-items: center;
  gap: 8px;
}
.MegaBuilder-sectionHead .FormControl {
  flex: 1 1 160px;
  min-width: 0;
  font-weight: 600;
}
.MegaBuilder-sectionHead .FormControl + .FormControl {
  flex: 0 1 180px;
  font-weight: normal;
}
.MegaBuilder-sectionOptions {
  margin: 10px 0;
  padding-left: 34px;
}
.MegaBuilder-handle {
  flex: 0 0 auto;
  padding: 8px 6px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--muted-color);
  cursor: grab;
  touch-action: none;
}
.MegaBuilder-handle:focus-visible {
  outline: 2px solid var(--primary-color);
}
.MegaBuilder-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 14px;
  margin: 0 0 10px;
  padding: 0 0 0 26px;
  list-style: none;
}
.MegaBuilder-link {
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--control-bg);
}
.MegaBuilder-link.is-invalid {
  box-shadow: inset 0 0 0 1px #d83e3e;
}
.MegaBuilder-linkLine .FormControl {
  flex: 1 1 140px;
  min-width: 0;
}
.MegaBuilder-linkLine .MegaBuilder-dest {
  flex: 0 1 210px;
}
.MegaBuilder-linkIcon {
  flex: 0 0 20px;
  text-align: center;
  color: var(--primary-color);
}
.MegaBuilder-linkMore {
  padding: 10px 4px 4px 34px;
}
.MegaBuilder-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 6px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
}
.MegaBuilder-error {
  flex-basis: 100%;
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: #d83e3e;
}
@media (max-width: 767.98px) {
  .MegaBuilder-sectionHead,
  .MegaBuilder-linkLine {
    flex-wrap: wrap;
  }
  .MegaBuilder-sectionOptions,
  .MegaBuilder-linkMore,
  .MegaBuilder-links {
    padding-left: 0;
  }
}
`;
