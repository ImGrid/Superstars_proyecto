import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  // color de fondo del icono. primary=neutral informativo, warning=amber, error=rojo, success=verde
  accent?: "primary" | "success" | "warning" | "error";
  description?: string;
  // si se provee, la card se vuelve clickable y navega a esa ruta
  href?: string;
}

const accentClasses: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "bg-primary-100 text-primary-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  error: "bg-error-100 text-error-700",
};

export function KpiCard({
  title,
  value,
  icon,
  accent = "primary",
  description,
  href,
}: KpiCardProps) {
  const content = (
    <CardContent className="flex items-center gap-4 p-5">
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          accentClasses[accent],
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-secondary-600">
          {title}
        </p>
        <p className="mt-0.5 text-2xl font-bold text-secondary-900">{value}</p>
        {description && (
          <p className="mt-0.5 truncate text-xs text-secondary-500">
            {description}
          </p>
        )}
      </div>
      {href && (
        <ArrowRight className="size-4 shrink-0 text-secondary-400 transition-transform group-hover:translate-x-0.5" />
      )}
    </CardContent>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        <Card className="transition-all hover:border-primary-200 hover:shadow-sm">
          {content}
        </Card>
      </Link>
    );
  }

  return <Card>{content}</Card>;
}
