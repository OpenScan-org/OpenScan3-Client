import assert from 'node:assert/strict'
import test from 'node:test'
import { createAnalysisSvg } from '../src/utils/analysisSvg.ts'

const input = {
  imageDataUrl: 'data:image/jpeg;base64,/9j/2Q==', width: 400, height: 300,
  capturedAt: '2026-11-11T12:00:00Z', summary: 'Good scan readiness',
  data: { format: 'openscan-analysis', version: 1, task: { id: 'test', result: { focus_analysis: { positions: [0, 1, 2] } } } }
}

test('SVG contains an embedded photo and the complete JSON, not an external image reference', () => {
  const svg = createAnalysisSvg(input)
  assert.ok(svg.includes('href="data:image/jpeg;base64,/9j/2Q=="'))
  const metadata = svg.match(/<metadata id="openscan-analysis">([\s\S]*?)<\/metadata>/)[1]
  const json = metadata.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  assert.deepEqual(JSON.parse(json), input.data)
  assert.ok(svg.includes('New photo captured at export:'))
})

test('embedded JSON and visible strings cannot introduce SVG markup', () => {
  const value = '</metadata><script>alert("x")</script> & "quotes"'
  const svg = createAnalysisSvg({ ...input, summary: value, data: { value } })
  assert.equal(svg.includes('<script>'), false)
  assert.ok(svg.includes('&lt;/metadata&gt;'))
  const metadata = svg.match(/<metadata id="openscan-analysis">([\s\S]*?)<\/metadata>/)[1]
  const json = metadata.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  assert.equal(JSON.parse(json).value, value)
})

test('portrait camera orientation swaps the displayed image dimensions', () => {
  const svg = createAnalysisSvg({ ...input, orientationFlag: 8 })
  assert.ok(svg.includes('matrix(0 -1 1 0 0 400)'))
  assert.ok(svg.includes('scale(3.3333333333333335)'))
})

test('invalid photo dimensions and external image URLs are rejected', () => {
  assert.throws(() => createAnalysisSvg({ ...input, width: 0 }))
  assert.throws(() => createAnalysisSvg({ ...input, height: NaN }))
  assert.throws(() => createAnalysisSvg({ ...input, imageDataUrl: 'https://example.com/photo.jpg' }))
})
