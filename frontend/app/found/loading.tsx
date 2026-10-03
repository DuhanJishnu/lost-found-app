import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-6" />
    </main>
  );
}