#!/usr/bin/env node
/**
 * Convert SVG assets to PNG for plugin submission.
 * Run once: npm install sharp   then   node make-png.js
 */
const sharp = require('sharp')
const path = require('path')
const dir = __dirname

const tasks = [
  { input: 'icon.svg',  output: 'icon.png',  width: 512,  height: 512  },
  { input: 'logo.svg',  output: 'logo.png',  width: 1280, height: 400  },
]

;(async () => {
  for (const { input, output, width, height } of tasks) {
    await sharp(path.join(dir, input))
      .resize(width, height)
      .png()
      .toFile(path.join(dir, output))
    console.log(`✓ ${output}`)
  }
  console.log('Done. Add screenshots (screenshot-*.png) manually from ChatGPT Developer Mode.')
})()
