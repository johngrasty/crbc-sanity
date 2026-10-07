// The pictures apps show for a series or a media item (contract section 3): a 16:9 thumbnail for
// lists, YouTube and Facebook, and a wide banner for the top of its page. Series and media items
// share this field: artworkField('series') or {...artworkField('mediaItem'), group: 'artwork'}.
import {tryGetImageDimensions} from '@sanity/asset-utils'
import {defineField} from 'sanity'
import {labelLimit} from './limits'

type ArtworkType = 'mediaItem' | 'series'

const descriptions: Record<ArtworkType, {thumbnail: string; banner: string}> = {
  mediaItem: {
    thumbnail:
      "A 16:9 picture, such as 1920 × 1080 pixels, shown with the recording in lists and on YouTube and Facebook. Without one, YouTube and Facebook show the first series' thumbnail.",
    banner: "A wide picture for the top of the recording's page.",
  },
  series: {
    thumbnail:
      'A 16:9 picture, such as 1920 × 1080 pixels, shown in lists of series. YouTube and Facebook also show it for a recording that has no thumbnail and lists this series first.',
    banner: 'A wide picture for the top of the series page.',
  },
}

// True when width:height is within 2% of 16:9. It compares 9 × width with 16 × height in whole
// numbers, so a picture exactly 2% off still counts.
const isWidescreen = ({width, height}: {width: number; height: number}) =>
  Math.abs(9 * width - 16 * height) * 50 <= 16 * height

// A warning when the thumbnail's picture isn't 16:9. The width and height are the uploaded
// picture's own, which Sanity writes into the asset's ID, as in image-<hash>-1920x1080-jpg. A crop
// or hotspot doesn't change them. An image still uploading reads as 0 × 0 and is skipped.
function thumbnailShape(image: unknown): true | string {
  const dimensions = tryGetImageDimensions(image as Parameters<typeof tryGetImageDimensions>[0])
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) return true
  if (isWidescreen(dimensions)) return true
  const {width, height} = dimensions
  return `This thumbnail is ${width} × ${height} pixels, not 16:9, so apps and YouTube will crop it. Use a picture shaped like 1920 × 1080.`
}

const altField = defineField({
  name: 'alt',
  title: 'Alt text',
  type: 'string',
  description: "Describe the picture for people who can't see it.",
  validation: (rule) => labelLimit(rule),
})

// The artwork object for one of the two types that have artwork.
export function artworkField(type: ArtworkType) {
  const {thumbnail, banner} = descriptions[type]
  return defineField({
    name: 'artwork',
    title: 'Artwork',
    type: 'object',
    fields: [
      defineField({
        name: 'thumbnail',
        title: 'Thumbnail',
        type: 'image',
        description: thumbnail,
        options: {hotspot: true},
        fields: [altField],
        validation: (rule) => rule.custom(thumbnailShape).warning(),
      }),
      defineField({
        name: 'banner',
        title: 'Banner',
        type: 'image',
        description: banner,
        options: {hotspot: true},
        fields: [altField],
      }),
    ],
  })
}
