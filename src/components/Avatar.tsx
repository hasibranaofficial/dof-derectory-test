"use client";

import { useState } from "react";

export function Avatar({ src, name, size = 80 }: { src?: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const photoSrc = src?.startsWith("/") ? `/dof-derectory-test${src}` : src;

  if (photoSrc && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photoSrc}
        onError={() => setFailed(true)}
        alt={name}
        width={size}
        height={Math.round(size * 1.2)}
        loading="lazy"
        className="shrink-0 rounded-lg bg-slate-100 object-cover ring-1 ring-slate-200"
        style={{ width: size, height: Math.round(size * 1.2) }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-300 ring-1 ring-emerald-100"
      style={{ width: size, height: Math.round(size * 1.2) }}
      aria-label="ছবি নেই"
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="currentColor">
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
      </svg>
    </div>
  );
}
