import './globals.css'
import Layout from './components/Layout'

export const metadata = {
  title: 'Mind Tech App',
  description: 'Mind Tech Stack Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  )
}
