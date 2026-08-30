import { describe, expect, it } from 'vitest'
import {
  analyzeText,
  countCharacters,
  countCharactersNoSpaces,
  countLines,
  countParagraphs,
  countSentences,
  countWords,
} from './calculate'

describe('countWords', () => {
  it('returns 0 for empty text', () => {
    expect(countWords('')).toBe(0)
  })

  it('returns 0 for whitespace-only text', () => {
    expect(countWords('   \n\t  ')).toBe(0)
  })

  it('does not count repeated spaces as extra words', () => {
    expect(countWords('Olá     mundo')).toBe(2)
  })

  it('ignores leading and trailing whitespace', () => {
    expect(countWords('   Olá mundo   ')).toBe(2)
  })

  it('counts words separated by newlines and tabs', () => {
    expect(countWords('Olá\nmundo\tbom dia')).toBe(4)
  })

  it('counts a single word correctly', () => {
    expect(countWords('Palavra')).toBe(1)
  })
})

describe('countCharacters', () => {
  it('returns 0 for empty text', () => {
    expect(countCharacters('')).toBe(0)
  })

  it('counts every character including spaces and punctuation', () => {
    expect(countCharacters('Olá, mundo!')).toBe(11)
  })

  it('counts Portuguese accented characters correctly', () => {
    expect(countCharacters('São Paulo é ótimo')).toBe('São Paulo é ótimo'.length)
    expect(countCharacters('ç ã õ é í ú â ê')).toBe(15)
  })
})

describe('countCharactersNoSpaces', () => {
  it('excludes spaces, tabs and newlines', () => {
    expect(countCharactersNoSpaces('a b\tc\nd')).toBe(4)
  })

  it('returns 0 for whitespace-only text', () => {
    expect(countCharactersNoSpaces('   \n\t')).toBe(0)
  })

  it('handles accented characters without dropping them', () => {
    expect(countCharactersNoSpaces('coração')).toBe(7)
  })
})

describe('countSentences', () => {
  it('returns 0 for empty text', () => {
    expect(countSentences('')).toBe(0)
  })

  it('returns 0 for whitespace-only text', () => {
    expect(countSentences('   ')).toBe(0)
  })

  it('counts sentences ending in ., ! or ?', () => {
    expect(countSentences('Olá. Como estás? Tudo bem!')).toBe(3)
  })

  it('treats consecutive punctuation as a single boundary', () => {
    expect(countSentences('Isto é... incrível! A sério?!')).toBe(3)
  })

  it('counts a trailing sentence with no final punctuation', () => {
    expect(countSentences('Primeira frase. Segunda sem ponto final')).toBe(2)
  })

  it('does not count a lone punctuation run as a sentence', () => {
    expect(countSentences('...')).toBe(0)
  })
})

describe('countParagraphs', () => {
  it('returns 0 for empty text', () => {
    expect(countParagraphs('')).toBe(0)
  })

  it('treats single-newline text as one paragraph', () => {
    expect(countParagraphs('Linha um\nLinha dois')).toBe(1)
  })

  it('splits on blank lines', () => {
    expect(countParagraphs('Primeiro parágrafo.\n\nSegundo parágrafo.\n\nTerceiro.')).toBe(3)
  })

  it('handles Windows line endings the same as Unix ones', () => {
    const unix = countParagraphs('Um.\n\nDois.')
    const windows = countParagraphs('Um.\r\n\r\nDois.')
    expect(windows).toBe(unix)
    expect(windows).toBe(2)
  })

  it('ignores extra blank lines between paragraphs', () => {
    expect(countParagraphs('Um.\n\n\n\nDois.')).toBe(2)
  })
})

describe('countLines', () => {
  it('returns 0 for empty text', () => {
    expect(countLines('')).toBe(0)
  })

  it('counts a single line of text as 1', () => {
    expect(countLines('Uma linha só')).toBe(1)
  })

  it('counts each newline-separated line', () => {
    expect(countLines('Linha 1\nLinha 2\nLinha 3')).toBe(3)
  })

  it('treats \\r\\n the same as \\n', () => {
    expect(countLines('Linha 1\r\nLinha 2')).toBe(countLines('Linha 1\nLinha 2'))
  })
})

describe('analyzeText', () => {
  it('returns all zeros for empty text', () => {
    expect(analyzeText('')).toEqual({
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      lines: 0,
    })
  })

  it('computes a consistent full report for multi-paragraph text', () => {
    const text = 'Este é o primeiro parágrafo. Tem duas frases!\n\nEste é o segundo parágrafo.'
    const stats = analyzeText(text)

    expect(stats.words).toBe(13)
    expect(stats.sentences).toBe(3)
    expect(stats.paragraphs).toBe(2)
    expect(stats.lines).toBe(3)
    expect(stats.characters).toBe(text.length)
    expect(stats.charactersNoSpaces).toBe(text.replace(/\s/g, '').length)
  })
})
