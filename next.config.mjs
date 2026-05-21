/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Гарантируем попадание базы знаний в serverless-бандл Vercel.
    // Без этого fs.readFile(process.cwd()/knowledge/...) падает с ENOENT в проде.
    outputFileTracingIncludes: {
      '/**/*': ['./knowledge/report-requirements/**/*'],
    },
  },
}

export default nextConfig
