import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-xl mx-auto px-4">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for. Please check the URL or go back to the homepage.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
        >
          Back to Homepage
        </Link>
      </div>
    </div>
  )
} 