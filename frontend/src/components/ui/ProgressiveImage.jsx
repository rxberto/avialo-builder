import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Carga progresiva de imágenes al estilo YouTube/Facebook:
 *  1. Reserva el espacio (sin saltos de layout / CLS).
 *  2. Muestra un placeholder borroso (LQIP) o un shimmer hasta que entra en viewport.
 *  3. Descarga la imagen real solo cuando está cerca de la pantalla (IntersectionObserver).
 *  4. Funde la imagen real sobre el placeholder al cargar.
 *
 * Props:
 *  - src        : ruta de la imagen real (idealmente WebP optimizada)
 *  - alt        : texto alternativo
 *  - lqip       : data-URI del placeholder de baja calidad (opcional)
 *  - className  : clases del <img> real
 *  - wrapperClassName : clases del contenedor
 *  - eager      : si true, carga de inmediato (para imágenes above-the-fold / LCP)
 *  - width/height : dimensiones intrínsecas para fijar el aspect-ratio
 */
export default function ProgressiveImage({
  src,
  alt = '',
  lqip,
  className,
  wrapperClassName,
  eager = false,
  width,
  height,
  ...imgProps
}) {
  // Eager (above-the-fold) o navegadores sin IntersectionObserver: cargar ya.
  // El resto espera a acercarse al viewport.
  const [inView, setInView] = useState(
    () => eager || typeof IntersectionObserver === 'undefined'
  );
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (inView) return;
    const el = wrapperRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      // Precargamos 200px antes de que aparezca para que llegue "ya cargada".
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  return (
    <div
      ref={wrapperRef}
      className={cn('relative overflow-hidden bg-muted', wrapperClassName)}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    >
      {/* Placeholder: LQIP borroso si lo hay, si no un shimmer animado */}
      {!loaded &&
        (lqip ? (
          <img
            src={lqip}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted-foreground/10" />
        ))}

      {inView && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-700 ease-out',
            loaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...imgProps}
        />
      )}
    </div>
  );
}
