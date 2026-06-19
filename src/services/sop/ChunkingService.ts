export interface TextChunk {
  section: string | null;
  content: string;
}

const HEADING_REGEX = /^#{2,3}\s+(.+)$/;
const MAX_CHUNK_CHARS = 1500;

function splitOversized(section: string | null, text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK_CHARS) {
    chunks.push({ section, content: text.slice(i, i + MAX_CHUNK_CHARS) });
  }
  return chunks;
}

export function chunkText(text: string): TextChunk[] {
  const lines = text.split('\n');
  const result: TextChunk[] = [];
  let currentSection: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join('\n').trim();
    buffer = [];
    if (content.length === 0) return;
    if (content.length <= MAX_CHUNK_CHARS) {
      result.push({ section: currentSection, content });
    } else {
      result.push(...splitOversized(currentSection, content));
    }
  };

  for (const line of lines) {
    const match = HEADING_REGEX.exec(line);
    if (match) {
      flush();
      currentSection = match[1] ?? null;
    } else {
      buffer.push(line);
    }
  }
  flush();

  return result;
}
