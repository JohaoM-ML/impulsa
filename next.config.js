/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/ventas', destination: '/registrar', permanent: false },
      { source: '/ventas/nueva', destination: '/registrar', permanent: false },
      { source: '/inventario', destination: '/mi-negocio', permanent: false },
      { source: '/inventario/nueva-guia', destination: '/registrar', permanent: false },
      { source: '/gastos', destination: '/registrar', permanent: false },
      { source: '/clientes', destination: '/mi-negocio', permanent: false },
    ]
  },
}

module.exports = nextConfig
