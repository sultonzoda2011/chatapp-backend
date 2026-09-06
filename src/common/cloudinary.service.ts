import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'

@Injectable()
export class CloudinaryService {
	constructor() {
		const cloudName = process.env.CLOUDINARY_CLOUD_NAME
		const apiKey = process.env.CLOUDINARY_API_KEY
		const apiSecret = process.env.CLOUDINARY_API_SECRET
		if (!cloudName || !apiKey || !apiSecret) {
			throw new ServiceUnavailableException(
				'Cloudinary storage is not configured'
			)
		}
		cloudinary.config({
			cloud_name: cloudName,
			api_key: apiKey,
			api_secret: apiSecret,
			secure: true
		})
	}

	async uploadImage(
		buffer: Buffer,
		folder: string
	): Promise<{ url: string; publicId: string }> {
		const result = await new Promise<UploadApiResponse>((resolve, reject) => {
			const stream = cloudinary.uploader.upload_stream(
				{
					folder,
					resource_type: 'image',
					transformation: [{ quality: 'auto', fetch_format: 'auto' }]
				},
				(error, response) =>
					error || !response
						? reject(error ?? new Error('Cloudinary upload failed'))
						: resolve(response)
			)
			stream.end(buffer)
		}).catch(() => {
			throw new ServiceUnavailableException('Image upload failed')
		})
		return { url: result.secure_url, publicId: result.public_id }
	}

	async deleteImage(publicId?: string | null) {
		if (!publicId) return
		await cloudinary.uploader
			.destroy(publicId, { resource_type: 'image' })
			.catch(() => undefined)
	}
}
