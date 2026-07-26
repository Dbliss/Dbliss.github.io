import { readFile, writeFile } from 'node:fs/promises'

const inputPaths = process.argv.slice(2, -1)
const outputPath = process.argv.at(-1)

if (inputPaths.length === 0 || !outputPath) {
  throw new Error('Usage: node scripts/build_nsw_suburb_boundaries.mjs <input...> <output>')
}

const pages = await Promise.all(
  inputPaths.map(async (inputPath) => JSON.parse(await readFile(inputPath, 'utf8')))
)

const features = pages
  .flatMap((page) => page.features || [])
  .map((feature) => ({
    c: feature.properties?.sal_code_2021,
    n: feature.properties?.sal_name_2021,
    g: feature.geometry
  }))
  .filter((feature) => feature.c && feature.n && feature.g)

const payload = {
  source: 'Australian Bureau of Statistics, ASGS Edition 3 Suburbs and Localities (2021), CC BY 4.0',
  sourceUrl: 'https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/SAL/MapServer',
  features
}

await writeFile(outputPath, JSON.stringify(payload))
console.log(`Wrote ${features.length} boundaries to ${outputPath}`)
