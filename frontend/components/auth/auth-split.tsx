import Image from "next/image";

interface AuthSplitProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthSplit({
  title,
  description,
  children,
}: AuthSplitProps) {
  return (
    <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
      <div className="hidden lg:col-span-5 lg:flex lg:flex-col lg:gap-5 lg:pt-4"> 

        <div>
          <h2 className="font-display text-4xl font-medium tracking-tight mt-10">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div>
          <Image
            src="/Box.webp"
            alt=""
            width={400}
            height={400}
            className="mt-6 rounded-xl object-cover"
          />
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-8 lg:shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
