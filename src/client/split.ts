/**
 * Split text into chunks that fit within maxBytes when UTF-8 encoded.
 * Prefers splitting at word boundaries (spaces). Falls back to character
 * boundaries when no space is found. Never splits mid-codepoint.
 */
export function splitText(text: string, maxBytes: number): string[] {
  const buf = Buffer.from(text, 'utf8')
  if (buf.length <= maxBytes) return [text]

  const chunks: string[] = []
  let offset = 0

  while (offset < buf.length) {
    let end = Math.min(offset + maxBytes, buf.length)

    if (end < buf.length) {
      // Back up past any partial multi-byte character
      const safeEnd = findSafeEnd(buf, offset, end)

      // Look for the last space within the safe range
      const spaceIdx = findLastSpace(buf, offset, safeEnd)

      if (spaceIdx > offset) {
        // Split at space, consume it
        chunks.push(buf.subarray(offset, spaceIdx).toString('utf8'))
        offset = spaceIdx + 1
      } else {
        // No space found — fall back to character boundary
        chunks.push(buf.subarray(offset, safeEnd).toString('utf8'))
        offset = safeEnd
      }
    } else {
      // Remainder fits
      chunks.push(buf.subarray(offset, end).toString('utf8'))
      offset = end
    }
  }

  return chunks
}

/** Back up `end` to a UTF-8 character boundary. */
function findSafeEnd(buf: Buffer, offset: number, end: number): number {
  // UTF-8 continuation bytes are 10xxxxxx (0x80-0xBF)
  while (end > offset && (buf[end]! & 0xc0) === 0x80) {
    end--
  }
  // Edge case: single character larger than maxBytes — include it
  if (end === offset) {
    end = offset + 1
    while (end < buf.length && (buf[end]! & 0xc0) === 0x80) {
      end++
    }
  }
  return end
}

/** Find the last ASCII space (0x20) between offset (inclusive) and end (exclusive). */
function findLastSpace(buf: Buffer, offset: number, end: number): number {
  for (let i = end - 1; i >= offset; i--) {
    if (buf[i] === 0x20) return i
  }
  return -1
}
