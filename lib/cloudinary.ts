import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary

export async function uploadBuffer(
  buffer: Buffer,
  options: { folder: string; resource_type?: 'image' | 'video' | 'raw' | 'auto'; public_id?: string }
): Promise<{ url: string; public_id: string; duration?: number }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { ...options, resource_type: options.resource_type ?? 'auto' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'))
        resolve({ url: result.secure_url, public_id: result.public_id, duration: result.duration })
      }
    )
    stream.end(buffer)
  })
}
