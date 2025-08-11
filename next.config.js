/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  assetPrefix: './',           // <-- ключик, який прибирає /_next з кореня
}