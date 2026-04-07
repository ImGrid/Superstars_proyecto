import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// layout de autenticacion (server component — sin useAuth para evitar loop)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary-50 px-4">
      <div className="mb-6 flex w-full max-w-md flex-col items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 self-start text-sm text-secondary-500 transition-colors hover:text-primary-700"
        >
          <ArrowLeft className="size-4" />
          Volver al inicio
        </Link>
        <Link
          href="/"
          className="font-heading text-[1.75rem] font-bold tracking-tight text-primary-600 transition-colors hover:text-primary-700"
        >
          SEGIC
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
