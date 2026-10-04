interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <h2 className="text-2xl font-semibold">{title}</h2>

      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
