import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-brand-tint">
      <main className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center px-5 py-10">
        <header className="mb-7 flex flex-col items-center text-center">
          <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-brand-dark shadow-md ring-1 ring-black/5">
            <Image
              src="/logo-impulsa.png"
              alt="Impulsa"
              width={80}
              height={80}
              className="h-20 w-20 object-cover"
              priority
            />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-brand-dark">Impulsa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu negocio crece contigo, paso a paso
          </p>
        </header>

        {children}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Hecho para bodegas y negocios del Perú
        </p>
      </main>
    </div>
  )
}
