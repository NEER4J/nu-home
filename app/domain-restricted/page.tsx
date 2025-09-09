import Link from 'next/link';

export default function DomainRestrictedPage() {
  return (
    <div className="min-h-[90vh] flex items-center justify-start p-8 max-w-[600px] mx-auto">
      <div className="text-left max-w-2xl">
        <div className="text-gray-500 text-sm mb-4">
          404 - PAGE NOT FOUND
        </div>
        
        <h1 className="text-6xl font-bold text-blue-600 mb-4">
          OOOPS!!
        </h1>
        
        <p className="text-2xl text-black mb-7">
          This is not the page you are looking for
        </p>
        
        <div className="text-gray-700 text-lg mb-6">
          Here are some helpful links instead:
        </div>
        
        <div className="flex space-x-6">
        
          <Link href="/boiler/quote" className="text-black underline hover:text-gray-600 transition-colors">
            Boiler Services
          </Link>
        
        </div>
      </div>
    </div>
  );
}
