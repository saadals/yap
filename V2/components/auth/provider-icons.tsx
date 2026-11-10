import { Phone } from "lucide-react";
import { useId } from "react";

import type { SignInMethod } from "@/lib/saved-accounts";

export const methodLabel: Record<SignInMethod, string> = {
  phone: "Phone",
  apple: "Apple",
  tiktok: "TikTok",
  instagram: "Instagram",
  google: "Google",
};

function AppleIcon({ size }: { size: number }) {
  return (
    <svg width={size * 0.89} height={size} viewBox="0 0 16 19" aria-hidden className="flex-none">
      <path
        fill="currentColor"
        d="M13.2 10.1c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8C3.7 5 2.2 5.9 1.4 7.3c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4 1.2 0 1.6-.8 3-.8s1.8.8 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.4-1-2.4-4.1zM11 3.3c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z"
      />
    </svg>
  );
}

function TikTokIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="flex-none">
      <path fill="#25F4EE" d="M9.4 10.2v-1a7 7 0 0 0-1-.1 6.6 6.6 0 0 0-3.7 12 6.6 6.6 0 0 1 4.7-10.9z" />
      <path
        fill="#FE2C55"
        d="M17.6 6.3A4.4 4.4 0 0 1 15.6 3h-1a4.5 4.5 0 0 0 3 3.3zM9.4 12.9a2.9 2.9 0 0 0-1.3 5.4 2.9 2.9 0 0 1 3.5-4.5V8.6a6 6 0 0 0-2.2-.4v1"
      />
      <path
        fill="currentColor"
        d="M18.6 7.4v3a8 8 0 0 1-4.6-1.5v6.6A6 6 0 0 1 4.7 20.4 6 6 0 0 0 15 16.3V9.6a8 8 0 0 0 4.6 1.5V7.6a4.6 4.6 0 0 1-1-.2zM14 15.5V8.9a8 8 0 0 0 4.6 1.5v-3a4.6 4.6 0 0 1-2.6-1.4A4.6 4.6 0 0 1 14 3h-2.4v13a2.8 2.8 0 0 1-5.1 1.5 2.8 2.8 0 0 1 3-4.6v-2.5A6 6 0 0 0 4.7 20.4 6 6 0 0 0 14 15.5z"
      />
    </svg>
  );
}

function InstagramIcon({ size }: { size: number }) {
  const gradient = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="flex-none">
      <defs>
        <linearGradient id={gradient} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset=".35" stopColor="#FA7E1E" />
          <stop offset=".6" stopColor="#D62976" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill={`url(#${gradient})`} />
      <circle cx="12" cy="12" r="4.3" fill="none" stroke="#fff" strokeWidth="1.9" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="#fff" />
    </svg>
  );
}

function GoogleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="flex-none">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export function MethodIcon({ method, size = 18 }: { method: SignInMethod; size?: number }) {
  if (method === "apple") return <AppleIcon size={size} />;
  if (method === "tiktok") return <TikTokIcon size={size} />;
  if (method === "instagram") return <InstagramIcon size={size} />;
  if (method === "google") return <GoogleIcon size={size} />;
  return <Phone size={size} aria-hidden className="flex-none" />;
}
