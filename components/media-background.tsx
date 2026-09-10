/**
 * Full-bleed background for the splash and auth pages. Video is optional —
 * if /public/videos/auth-bg.mp4 doesn't exist, the browser just shows the
 * poster image; if that's missing too, it falls back to the gradient
 * already used elsewhere so nothing breaks with zero assets supplied.
 *
 * Add your own assets at:
 *   public/videos/auth-bg.mp4   (optional)
 *   public/images/auth-bg.jpg   (used as video poster, and as the
 *                                 background alone if you skip video)
 *
 * Recommended specs, since this loads on every visit to these pages:
 *   Video: 1080p or less, H.264 mp4, under ~4MB, 10-20s loop, no audio track
 *   Image: 1920x1080 or less, JPG, under ~300KB
 * Free, properly-licensed options: Pexels and Coverr both offer video and
 * photo downloads with licenses that permit this kind of use.
 */
export default function MediaBackground({
  children,
  videoSrc = "/videos/auth-bg.mp4",
  imageSrc = "/images/auth-bg.jpg",
  overlayClassName = "bg-gradient-to-b from-brand-navy/80 via-brand-navy/60 to-brand-navy/85",
}: {
  children: React.ReactNode;
  videoSrc?: string;
  imageSrc?: string;
  overlayClassName?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-navy via-blue-deep to-blue">
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={imageSrc}
          className="w-full h-full object-cover"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        <div className={`absolute inset-0 ${overlayClassName}`} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
