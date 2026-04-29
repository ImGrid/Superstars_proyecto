export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-secondary-900">404</h1>
        <p className="mt-2 text-secondary-600">Página no encontrada</p>
        <a
          href="/"
          className="mt-4 inline-block text-primary-600 hover:text-primary-700"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
