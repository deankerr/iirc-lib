export type CasemappingType = 'ascii' | 'rfc1459' | 'rfc1459-strict'

export type Casemapper = {
  fold: (str: string) => string
  equal: (a: string, b: string) => boolean
}

function createCasemapper(foldFn: (str: string) => string): Casemapper {
  return {
    fold: foldFn,
    equal: (a, b) => foldFn(a) === foldFn(b),
  }
}

function foldAscii(str: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    // A-Z → a-z
    if (code >= 0x41 && code <= 0x5a) {
      result += String.fromCharCode(code + 0x20)
    } else {
      result += str[i]
    }
  }
  return result
}

function foldRfc1459(str: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    // A-Z → a-z
    if (code >= 0x41 && code <= 0x5a) {
      result += String.fromCharCode(code + 0x20)
    }
    // []^\ → {}~|  (0x5b-0x5e → 0x7b-0x7e)
    else if (code >= 0x5b && code <= 0x5e) {
      result += String.fromCharCode(code + 0x20)
    } else {
      result += str[i]
    }
  }
  return result
}

function foldRfc1459Strict(str: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    // A-Z → a-z
    if (code >= 0x41 && code <= 0x5a) {
      result += String.fromCharCode(code + 0x20)
    }
    // []\ → {}|  (0x5b-0x5d → 0x7b-0x7d) — NOT ^ → ~
    else if (code >= 0x5b && code <= 0x5d) {
      result += String.fromCharCode(code + 0x20)
    } else {
      result += str[i]
    }
  }
  return result
}

export const casemapping: Record<CasemappingType, Casemapper> = {
  ascii: createCasemapper(foldAscii),
  rfc1459: createCasemapper(foldRfc1459),
  'rfc1459-strict': createCasemapper(foldRfc1459Strict),
}

// Default casemapper (rfc1459 per spec)
export const defaultCasemapper = casemapping.rfc1459
