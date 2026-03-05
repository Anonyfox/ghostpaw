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
`;
