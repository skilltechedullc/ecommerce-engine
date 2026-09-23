import { HttpError } from '@/lib/server/api'

const SIGNATURES: Record<string, Array<number | null>> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
}

type ImageDimensions = {
  width: number
  height: number
}

type DimensionOptions = {
  maxWidth: number
  maxHeight: number
  maxPixels: number
}

export function assertAllowedImageSignature(bytes: Uint8Array, mimeType: string): void {
  const signature = SIGNATURES[mimeType]
  if (!signature) {
    throw new HttpError(400, 'Unsupported image type', 'VALIDATION_ERROR')
  }

  const matches = signature.every((expected, index) => expected === null || bytes[index] === expected)
  if (!matches) {
    throw new HttpError(400, 'File content does not match the declared image type', 'INVALID_FILE_SIGNATURE')
  }
}

function readUint16BigEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) + bytes[offset + 1]
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16)
}

function readUint32BigEndian(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] * 0x1000000) +
    ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
  )
}

function parsePngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null
  return {
    width: readUint32BigEndian(bytes, 16),
    height: readUint32BigEndian(bytes, 20),
  }
}

function parseGifDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 10) return null
  return {
    width: bytes[6] + (bytes[7] << 8),
    height: bytes[8] + (bytes[9] << 8),
  }
}

function parseJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  let offset = 2
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) return null
    const marker = bytes[offset + 1]
    const length = readUint16BigEndian(bytes, offset + 2)

    if (length < 2) return null

    const isStartOfFrame = (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    )

    if (isStartOfFrame) {
      return {
        height: readUint16BigEndian(bytes, offset + 5),
        width: readUint16BigEndian(bytes, offset + 7),
      }
    }

    offset += 2 + length
  }

  return null
}

function parseWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 30) return null

  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])
  if (chunk === 'VP8X' && bytes.length >= 30) {
    return {
      width: readUint24LittleEndian(bytes, 24) + 1,
      height: readUint24LittleEndian(bytes, 27) + 1,
    }
  }

  if (chunk === 'VP8 ' && bytes.length >= 30) {
    return {
      width: readUint16BigEndian(new Uint8Array([bytes[27], bytes[26]]), 0) & 0x3fff,
      height: readUint16BigEndian(new Uint8Array([bytes[29], bytes[28]]), 0) & 0x3fff,
    }
  }

  if (chunk === 'VP8L' && bytes.length >= 25) {
    const b0 = bytes[21]
    const b1 = bytes[22]
    const b2 = bytes[23]
    const b3 = bytes[24]
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    }
  }

  return null
}

export function getImageDimensions(bytes: Uint8Array, mimeType: string): ImageDimensions | null {
  switch (mimeType) {
    case 'image/png':
      return parsePngDimensions(bytes)
    case 'image/jpeg':
      return parseJpegDimensions(bytes)
    case 'image/gif':
      return parseGifDimensions(bytes)
    case 'image/webp':
      return parseWebpDimensions(bytes)
    default:
      return null
  }
}

export function assertImageDimensions(bytes: Uint8Array, mimeType: string, options: DimensionOptions): void {
  const dimensions = getImageDimensions(bytes, mimeType)
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    throw new HttpError(400, 'Could not read image dimensions', 'INVALID_IMAGE_DIMENSIONS')
  }

  const pixels = dimensions.width * dimensions.height
  if (
    dimensions.width > options.maxWidth ||
    dimensions.height > options.maxHeight ||
    pixels > options.maxPixels
  ) {
    throw new HttpError(400, 'Image dimensions exceed the allowed limit', 'IMAGE_DIMENSIONS_TOO_LARGE', {
      width: dimensions.width,
      height: dimensions.height,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      maxPixels: options.maxPixels,
    })
  }
}
