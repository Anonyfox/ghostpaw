import { renderToString } from "preact-render-to-string";

function Shell({ bootId }: { bootId: string }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Ghostpaw</title>
        <link rel="stylesheet" href={`/assets/style.css?v=${bootId}`} />
      </head>
      <body>
        <div id="app"></div>
        <script type="module" src={`/assets/app.js?v=${bootId}`} />
      </body>
    </html>
  );
}

export function renderShell(bootId: string): string {
  return `<!DOCTYPE html>${renderToString(<Shell bootId={bootId} />)}`;
}
