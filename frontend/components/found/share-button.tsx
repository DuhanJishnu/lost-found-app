"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — nothing to do.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share this item"
      title={copied ? "Link copied" : "Share this item"}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-accent hover:text-primary"
    >
      {copied ? (
        <Check className="h-5 w-5 text-primary" />
      ) : (
        <Share2 className="h-5 w-5" />
      )}
    </button>
  );
}
