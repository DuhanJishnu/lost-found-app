interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="mb-10 flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl">
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          {title}
        </h1>

        {description && (
          <p className="mt-3 text-muted-foreground">{description}</p>
        )}
      </div>

      {action}
    </header>
  );
}
