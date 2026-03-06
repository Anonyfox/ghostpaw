export const customCss = `
.rendered-markdown pre {
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
  overflow-x: auto;
}
.rendered-markdown code {
  color: var(--bs-info);
  font-size: 0.875em;
}
.rendered-markdown pre code {
  color: inherit;
  font-size: inherit;
}
.rendered-markdown blockquote {
  border-left: 3px solid var(--bs-info);
  padding: 0.25rem 0.75rem;
  color: var(--bs-secondary-color);
  margin: 0.5rem 0;
}
.rendered-markdown a {
  color: var(--bs-info);
}
.rendered-markdown table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
}
.rendered-markdown th,
.rendered-markdown td {
  border: 1px solid var(--bs-border-color);
  padding: 0.375rem 0.75rem;
  text-align: left;
}
.rendered-markdown th {
  background: var(--bs-tertiary-bg);
}
.rendered-markdown hr {
  border-color: var(--bs-border-color);
}
.rendered-markdown img {
  max-width: 100%;
  border-radius: 0.375rem;
}
.rendered-markdown p:last-child {
  margin-bottom: 0;
}
.offcanvas.show {
  visibility: visible !important;
  transform: none;
}
.offcanvas-backdrop.show {
  opacity: 0.5;
}

/* Quest system */
.quest-row {
  transition: background-color 0.15s ease;
}
.quest-row:hover {
  background-color: var(--bs-tertiary-bg);
}
.quest-row-expanded {
  background-color: var(--bs-tertiary-bg);
}
.quest-overdue {
  border-left: 3px solid var(--bs-danger);
  background-color: rgba(var(--bs-danger-rgb), 0.05);
}
.quest-due-soon {
  border-left: 3px solid var(--bs-warning);
}
.quest-today {
  border-left: 3px solid var(--bs-info);
}
.quest-progress-bar {
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: var(--bs-tertiary-bg);
}
.quest-progress-bar .progress-bar {
  transition: width 0.4s ease;
  background: linear-gradient(90deg, var(--bs-info), #6dd5ed) !important;
}
.quest-recurrence-badge {
  font-size: 0.7em;
  vertical-align: middle;
}
.bulletin-section {
  padding: 0.25rem 0;
}

/* Quest Board */
.quest-board-icon {
  font-weight: 900;
  font-size: 1.2em;
  min-width: 1.2em;
  text-align: center;
  display: inline-block;
  line-height: 1;
}
.quest-board-icon-exclaim {
  color: var(--bs-warning);
  text-shadow: 0 0 4px rgba(255, 193, 7, 0.4);
}
.quest-board-icon-question {
  color: var(--bs-warning);
  opacity: 0.85;
}
.quest-board-row {
  transition: background-color 0.15s ease;
}
.quest-board-row:hover {
  background-color: var(--bs-tertiary-bg);
}
.quest-board-quickadd {
  border: 2px dashed var(--bs-warning);
  border-radius: 0.5rem;
  background: rgba(255, 193, 7, 0.03);
}

/* Recurrence picker */
.recurrence-picker .day-toggle {
  width: 2.2em;
  height: 2.2em;
  border-radius: 50%;
  padding: 0;
  font-size: 0.75em;
  font-weight: 600;
}
.recurrence-picker .day-toggle.active {
  background-color: var(--bs-info);
  color: white;
  border-color: var(--bs-info);
}
.recurrence-picker .preview {
  color: var(--bs-info);
  font-style: italic;
  font-size: 0.85em;
}
.howl-card-pending {
  border-left: 3px solid var(--bs-info) !important;
  transition: box-shadow 0.2s;
}
.howl-card-pending:hover {
  box-shadow: 0 0 0 0.15rem rgba(var(--bs-info-rgb), 0.15);
}
.howl-ghost-icon {
  font-size: 1.5rem;
  line-height: 1;
}
.howl-history-row {
  cursor: pointer;
  border-bottom: 1px solid var(--bs-border-color);
  transition: background 0.15s;
}
.howl-history-row:hover {
  background: rgba(var(--bs-info-rgb), 0.05);
}
`;
