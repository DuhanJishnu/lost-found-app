"use client";

import { useState } from "react";
import { Quote } from "lucide-react";

import { quoteForDate } from "./quotes";

export function QuoteOfDay() {
  const [quote] = useState(() => quoteForDate(new Date()));

  return (
    <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
      <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="italic">{quote}</span>
    </p>
  );
}
