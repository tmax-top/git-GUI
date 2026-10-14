const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i

export function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path)
}
