/**
 * Compress all images in the event-images bucket.
 * Downloads, compresses to WebP (800px max, quality 80%), re-uploads.
 *
 * Usage: node scripts/compress-bucket-images.cjs
 */

const { createClient } = require('@supabase/supabase-js')
const { readFileSync } = require('fs')
const { resolve } = require('path')
const sharp = require('sharp')

const envPath = resolve(__dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx), line.slice(idx + 1)]
    })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY)
const BUCKET = 'event-images'
const MAX_WIDTH = 800
const QUALITY = 80

async function main() {
  console.log('Listing files in bucket...')
  const { data: files, error } = await supabase.storage.from(BUCKET).list('', { limit: 500 })

  if (error) {
    console.error('Failed to list:', error.message)
    process.exit(1)
  }

  const toCompress = files.filter(f => !f.name.endsWith('.webp') && f.metadata?.size > 150 * 1024)
  console.log(`Found ${files.length} files, ${toCompress.length} need compression (>150KB, not WebP)\n`)

  let ok = 0, fail = 0

  for (const file of toCompress) {
    const origKB = (file.metadata.size / 1024).toFixed(0)
    process.stdout.write(`  ${file.name} (${origKB} KB) -> `)

    try {
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(file.name)
      if (dlErr || !blob) { console.log(`FAIL dl: ${dlErr?.message}`); fail++; continue }

      const buffer = Buffer.from(await blob.arrayBuffer())
      const compressed = await sharp(buffer)
        .resize(MAX_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer()

      const newKB = (compressed.length / 1024).toFixed(0)
      const reduction = Math.round((1 - compressed.length / file.metadata.size) * 100)

      const newName = file.name.replace(/\.[^.]+$/, '.webp')
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(newName, compressed, {
        contentType: 'image/webp',
        upsert: true,
      })

      if (upErr) { console.log(`FAIL upload: ${upErr.message}`); fail++; continue }

      if (newName !== file.name) {
        await supabase.storage.from(BUCKET).remove([file.name])
      }

      console.log(`${newKB} KB (-${reduction}%) OK`)
      ok++
    } catch (err) {
      console.log(`FAIL: ${err.message}`)
      fail++
    }
  }

  console.log(`\nDone! Compressed: ${ok}, Failed: ${fail}`)
}

main()
