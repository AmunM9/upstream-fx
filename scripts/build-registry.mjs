// Inlines source files into shadcn registry items: registry.json -> public/r/<name>.json
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'r')
const registry = JSON.parse(await readFile(join(root, 'registry.json'), 'utf8'))

await mkdir(outDir, { recursive: true })

for (const item of registry.items) {
  const files = await Promise.all(
    item.files.map(async (file) => {
      const absolute = resolve(root, file.path)
      const inside = relative(join(root, 'src'), absolute)
      if (inside.startsWith('..') || isAbsolute(inside)) throw new Error(`registry: ${file.path} is outside src/`)
      return { ...file, content: await readFile(absolute, 'utf8') }
    }),
  )
  const output = { $schema: 'https://ui.shadcn.com/schema/registry-item.json', ...item, files }
  await writeFile(join(outDir, `${item.name}.json`), `${JSON.stringify(output, null, 2)}\n`)
  process.stdout.write(`registry: wrote public/r/${item.name}.json (${files.length} files)\n`)
}
