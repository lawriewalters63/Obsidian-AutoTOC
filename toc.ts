export const TOC_START = "<!-- automatic-toc:start -->";
export const TOC_END = "<!-- automatic-toc:end -->";

export function hasToc(markdown: string): boolean {
  return markdown.split("\n").some((line) => line.trim() === TOC_START);
}

export function hasNoTocProperty(markdown: string): boolean {
  const lines = markdown.split("\n");
  if (lines[0]?.trim() !== "---") return false;
  const propertiesEnd = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (propertiesEnd < 0) return false;

  return lines.slice(1, propertiesEnd).some((line) => {
    const match = line.match(/^\s*["']?notoc["']?\s*:\s*([^#]*?)(?:\s+#.*)?$/i);
    if (!match) return false;
    return match[1].trim().replace(/^["']|["']$/g, "").toLowerCase() === "true";
  });
}

export function ensureNoTocProperty(markdown: string): string {
  const lines = markdown.split("\n");
  if (lines[0]?.trim() === "---") {
    const propertiesEnd = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
    if (propertiesEnd >= 0) {
      const propertyLine = lines.findIndex((line, index) =>
        index > 0 && index < propertiesEnd && /^\s*["']?notoc["']?\s*:/i.test(line)
      );
      if (propertyLine >= 0) {
        lines[propertyLine] = lines[propertyLine].replace(/^(\s*)["']?notoc["']?(\s*:)/i, "$1NoTOC$2");
        return lines.join("\n");
      }
      lines.splice(propertiesEnd, 0, "NoTOC: false");
      return lines.join("\n");
    }
  }

  return `---\nNoTOC: false\n---\n\n${markdown}`;
}

export function removeNoTocProperty(markdown: string): string {
  const hadFinalNewline = markdown.endsWith("\n");
  const lines = markdown.split("\n");
  if (lines[0]?.trim() !== "---") return markdown;
  const propertiesEnd = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (propertiesEnd < 0) return markdown;
  const propertyLine = lines.findIndex((line, index) =>
    index > 0 && index < propertiesEnd && /^\s*["']?notoc["']?\s*:/i.test(line)
  );
  if (propertyLine < 0) return markdown;

  lines.splice(propertyLine, 1);
  const newPropertiesEnd = propertiesEnd - 1;
  const hasOtherProperties = lines.slice(1, newPropertiesEnd).some((line) => line.trim() !== "");
  if (!hasOtherProperties) {
    lines.splice(0, newPropertiesEnd + 1);
    while (lines[0] === "") lines.shift();
  }

  let result = lines.join("\n");
  if (hadFinalNewline && !result.endsWith("\n")) result += "\n";
  return result;
}

export interface TocOptions {
  title: string;
  minLevel: number;
  maxLevel: number;
  includeH1: boolean;
  placement: "frontmatter" | "first-h1";
}

interface Heading {
  level: number;
  text: string;
  line: number;
}

interface TocRange {
  start: number;
  end: number;
}

function tocRange(lines: string[]): TocRange | null {
  const start = lines.findIndex((line) => line.trim() === TOC_START);
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index >= start && line.trim() === TOC_END);
  return end < 0 ? { start, end: start } : { start, end };
}

function cleanHeading(raw: string): string {
  return raw
    .replace(/\s+#+\s*$/, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, alias?: string) => alias ?? target)
    .replace(/[*_~`]/g, "")
    .trim();
}

export function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split("\n");
  const range = tocRange(lines);
  const headings: Heading[] = [];
  let fence: string | null = null;
  let propertiesEnd = -1;

  if (lines[0]?.trim() === "---") {
    propertiesEnd = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (propertiesEnd >= 0 && index <= propertiesEnd) continue;
    if (range && index >= range.start && index <= range.end) continue;
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === marker) fence = null;
      else if (fence === null) fence = marker;
      continue;
    }
    if (fence !== null) continue;

    const atx = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (atx) {
      const text = cleanHeading(atx[2]);
      if (text) headings.push({ level: atx[1].length, text, line: index });
      continue;
    }

    if (index + 1 < lines.length && line.trim() && !/^\s*>/.test(line)) {
      const setext = lines[index + 1].match(/^\s*(=+|-+)\s*$/);
      if (setext) {
        headings.push({ level: setext[1][0] === "=" ? 1 : 2, text: cleanHeading(line), line: index });
        index += 1;
      }
    }
  }
  return headings;
}

function escapeAlias(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\]/g, "\\]");
}

export function buildToc(markdown: string, options: TocOptions): string {
  if (hasNoTocProperty(markdown)) return "";
  const headings = extractHeadings(markdown).filter((heading) =>
    heading.level >= options.minLevel &&
    heading.level <= options.maxLevel &&
    (options.includeH1 || heading.level !== 1)
  );

  const title = options.title.trim();
  const titleLine = title ? `## ${title}` : "";
  if (headings.length === 0) return "";

  const baseLevel = Math.min(...headings.map((heading) => heading.level));
  const items = headings.map((heading) => {
    const label = escapeAlias(heading.text);
    const indent = "  ".repeat(Math.max(0, heading.level - baseLevel));
    return `${indent}- [[#${label}|${label}]]`;
  });
  return [TOC_START, titleLine, ...items, TOC_END].filter(Boolean).join("\n");
}

function insertionLine(lines: string[], markdown: string, placement: TocOptions["placement"]): number {
  if (placement === "first-h1") {
    const firstH1 = extractHeadings(markdown).find((heading) => heading.level === 1);
    if (firstH1) {
      const underline = lines[firstH1.line + 1];
      return underline && /^\s*=+\s*$/.test(underline) ? firstH1.line + 2 : firstH1.line + 1;
    }
  }

  if (lines[0]?.trim() === "---") {
    const closing = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
    if (closing >= 0) return closing + 1;
  }
  return 0;
}

export function updateToc(markdown: string, options: TocOptions): string {
  const controlledMarkdown = ensureNoTocProperty(markdown);
  const hadFinalNewline = controlledMarkdown.endsWith("\n");
  const lines = controlledMarkdown.split("\n");
  const range = tocRange(lines);
  const generated = buildToc(controlledMarkdown, options);

  if (!generated) return range ? removeToc(controlledMarkdown) : controlledMarkdown;

  const block = generated.split("\n");

  if (range) {
    lines.splice(range.start, range.end - range.start + 1, ...block);
  } else {
    const position = insertionLine(lines, controlledMarkdown, options.placement);
    const prefixBlank = position > 0 && lines[position - 1]?.trim() !== "";
    const suffixBlank = lines[position]?.trim() !== "";
    lines.splice(position, 0, ...(prefixBlank ? [""] : []), ...block, ...(suffixBlank ? [""] : []));
  }

  let result = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  if (hadFinalNewline && !result.endsWith("\n")) result += "\n";
  return result;
}

export function removeToc(markdown: string): string {
  const hadFinalNewline = markdown.endsWith("\n");
  const lines = markdown.split("\n");
  const range = tocRange(lines);
  if (!range) return markdown;
  lines.splice(range.start, range.end - range.start + 1);
  let result = lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "");
  if (hadFinalNewline && !result.endsWith("\n")) result += "\n";
  return result;
}
