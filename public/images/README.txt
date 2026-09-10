Put your background image here as: auth-bg.jpg

Used two ways:
- As the video's poster frame (shown while the video loads, or on
  browsers/devices that don't autoplay video)
- As the entire background if you don't add a video at all

Recommended specs:
- 1920x1080 or less
- JPG, under ~300KB — same reasoning as the video, this loads before
  someone has any reason to trust the app yet
- Should work as a backdrop behind white text and a light card — a
  darker or more muted image reads better than something busy/bright,
  since components/media-background.tsx also lays a dark gradient
  overlay on top for legibility

Free, properly-licensed sources: Pexels (pexels.com), Unsplash
(unsplash.com), and Coverr (coverr.co) all offer downloads under
licenses that permit this kind of use.

If you skip this file too, the page falls back to a plain navy-to-blue
gradient — same as before this feature was added.
