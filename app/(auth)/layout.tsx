export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[390px] flex-col justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">Impulsa</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu negocio, en tu bolsillo
        </p>
      </div>
      {children}
    </div>
  )
}
