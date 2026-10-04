import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

interface LinkButtonProps
  extends Omit<ComponentProps<typeof Button>, "render" | "nativeButton"> {
  href: string;
}

/** A Button that renders as a Next.js <Link>. */
export function LinkButton({ href, children, ...props }: LinkButtonProps) {
  return (
    <Button nativeButton={false} render={<Link href={href} />} {...props}>
      {children}
    </Button>
  );
}
