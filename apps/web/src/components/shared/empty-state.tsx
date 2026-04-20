import { Icon } from "@iconify/react";

interface EmptyStateProps {
  // nombre del icono Iconify (ej: "ph:trophy-duotone")
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-secondary-100">
        <Icon icon={icon} className="size-6 text-secondary-400" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-secondary-900">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-secondary-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
