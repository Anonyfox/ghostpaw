import { renderToString } from "preact-render-to-string";

const FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐾</text></svg>";

function Shell({ nonce, bootId }: { nonce: string; bootId: string }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Ghostpaw</title>
        <link rel="stylesheet" href={`/assets/style.css?v=${bootId}`} nonce={nonce} />
        <link rel="icon" href={FAVICON} />
      </head>
      <body>
        <div id="app"></div>
        <script type="module" src={`/assets/app.js?v=${bootId}`} nonce={nonce} />
      </body>
    </html>
  );
}

export function renderShell(nonce: string, bootId: string): string {
  return `<!DOCTYPE html>${renderToString(<Shell nonce={nonce} bootId={bootId} />)}`;
}
