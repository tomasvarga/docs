/**
 * Custom TypeDoc markdown theme for E2B SDK reference docs.
 * Cleans up generated markdown for Mintlify compatibility.
 */
const { MarkdownPageEvent } = require('typedoc-plugin-markdown')

function load(app) {
  // listen to the render event
  app.renderer.on(MarkdownPageEvent.END, (page) => {
    page.contents = processPageContents(page.contents)
  })
}

function processPageContents(text) {
  return removeMarkdownLinks(
    removeFirstNLines(convertH5toH3(removeLinesWithConditions(text)), 6)
  )
}

// makes methods in the sdk reference look more prominent
function convertH5toH3(text) {
  return text.replace(/^##### (.*)$/gm, '### $1')
}

// removes markdown-style links, keeps link text
function removeMarkdownLinks(text) {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
}

function removeFirstNLines(text, n) {
  return text.split('\n').slice(n).join('\n')
}

// removes "Extends", "Overrides", "Inherited from" sections
function removeLinesWithConditions(text) {
  const lines = text.split('\n')
  const filteredLines = []

  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].startsWith('#### Extends') ||
      lines[i].startsWith('###### Overrides') ||
      lines[i].startsWith('###### Inherited from')
    ) {
      // section length varies: with useCodeBlocks the target is rendered as
      // a fenced code block when the parent has no doc page (e.g. classes
      // extending the built-in Error), so a fixed line count would leave an
      // orphan closing fence behind
      i = indexAfterSectionBody(lines, i) - 1
      continue
    }

    if (lines[i].startsWith('##### new')) {
      // avoid promoting constructors
      i += 1
      continue
    }

    filteredLines.push(lines[i])
  }

  return filteredLines.join('\n')
}

// returns the index of the first line after the section body starting at
// headingIndex (the next heading or thematic break), treating fenced code
// blocks as opaque
function indexAfterSectionBody(lines, headingIndex) {
  let i = headingIndex + 1
  while (i < lines.length) {
    if (lines[i].startsWith('```')) {
      i++
      while (i < lines.length && !lines[i].startsWith('```')) i++
      i++
      continue
    }
    if (lines[i].startsWith('#') || lines[i].startsWith('***')) break
    i++
  }
  return i
}

module.exports = { load, processPageContents }

