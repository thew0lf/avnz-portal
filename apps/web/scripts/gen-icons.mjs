import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(process.cwd())
const svgPath = path.join(root, 'public', 'icon.svg')
const out192 = path.join(root, 'public', 'icon-192.png')
const out512 = path.join(root, 'public', 'icon-512.png')
const apple = path.join(root, 'public', 'apple-touch-icon.png')

const svg = await readFile(svgPath)
await sharp(svg).resize(192, 192).png().toFile(out192)
await sharp(svg).resize(512, 512).png().toFile(out512)
await sharp(svg).resize(180, 180).png().toFile(apple)
console.log('Generated icons:', { out192, out512, apple })

