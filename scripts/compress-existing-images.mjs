/**
 * One-time script: compress existing event images in Supabase storage.
 * Downloads each image, compresses to WebP (800px max, quality 80%),
 * re-uploads, and updates the events table.
 *
 * Usage: node scripts/compress-existing-images.mjs
 *
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 * (or set SUPABASE_SERVICE_ROLE_KEY for full access)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env manually
const envPath = resolve(import.meta.dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx), line.slice(idx + 1)]
    })
)

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const MAX_WIDTH = 800
const QUALITY = 80
const BUCKET = 'event-images'

async function compressWithCanvas(buffer) {
  // Use sharp if available, otherwise skip
  const sharp = (await import('sharp')).default
  const image = sharp(buffer)
  const meta = await image.metadata()

  let width = meta.width || MAX_WIDTH
  let height = meta.height || MAX_WIDTH
  if (width > MAX_WIDTH) {
    height = Math.round((height * MAX_WIDTH) / width)
    width = MAX_WIDTH
  }

  return image
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer()
}

async function main() {
  console.log('Fetching events with images...')

  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, image_url')
    .not('image_url', 'is', null)

  if (error) {
    console.error('Failed to fetch events:', error.message)
    process.exit(1)
  }

  console.log(`Found ${events.length} events with images.\n`)

  let compressed = 0
  let skipped = 0
  let failed = 0

  for (const event of events) {
    const url = event.image_url
    if (!url) continue

    // Extract file path from URL
    const bucketUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`
    if (!url.startsWith(bucketUrl)) {
      console.log(`  SKIP ${event.name} — external URL`)
      skipped++
      continue
    }

    const oldPath = url.replace(bucketUrl, '')

    // Already compressed?
    if (oldPath.endsWith('.webp')) {
      console.log(`  SKIP ${event.name} — already WebP`)
      skipped++
      continue
    }

    console.log(`  Processing: ${event.name}`)
    console.log(`    Old path: ${oldPath}`)

    try {
      // Download
      const { data: fileData, error: dlError } = await supabase.storage
        .from(BUCKET)
        .download(oldPath)

      if (dlError || !fileData) {
        console.log(`    FAIL download: ${dlError?.message}`)
        failed++
        continue
      }

      const originalSize = fileData.size
      console.log(`    Original: ${(originalSize / 1024).toFixed(0)} KB`)

      // Compress
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const compressed_buf = await compressWithCanvas(buffer)
      const newSize = compressed_buf.length
      console.log(`    Compressed: ${(newSize / 1024).toFixed(0)} KB (${Math.round((1 - newSize / originalSize) * 100)}% reduction)`)

      // Upload new file
      const newPath = oldPath.replace(/\.[^.]+$/, '.webp')
      const { error: upError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, compressed_buf, {
          contentType: 'image/webp',
          upsert: true,
        })

      if (upError) {
        console.log(`    FAIL upload: ${upError.message}`)
        failed++
        continue
      }

      // Update event URL
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(newPath)

      const { error: updateError } = await supabase
        .from('events')
        .update({ image_url: urlData.publicUrl })
        .eq('id', event.id)

      if (updateError) {
        console.log(`    FAIL update DB: ${updateError.message}`)
        failed++
        continue
      }

      console.log(`    OK -> ${newPath}`)
      compressed++
    } catch (err) {
      console.log(`    FAIL: ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone! Compressed: ${compressed}, Skipped: ${skipped}, Failed: ${failed}`)
}

main()
