import { marked } from "marked";
import { useMemo } from "preact/hooks";

interface RenderMarkdownProps {
  content: string;
}

export function RenderMarkdown({ content }: RenderMarkdownProps) {
  const html = useMemo(() => {
    if (!content) return "";
    return marked.parse(content, { async: false }) as string;
  }, [content]);

  return <div class="rendered-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
