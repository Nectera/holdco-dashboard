import { put, del } from '@vercel/blob'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const blob = await put(file.name, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return new Response(JSON.stringify({ url: blob.url, name: file.name, size: file.size, type: file.type }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Upload error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { url } = await request.json()
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN })
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
