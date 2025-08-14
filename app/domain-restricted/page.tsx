import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DomainRestrictedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-slate-800">
            Access Restricted
          </CardTitle>
          <CardDescription className="text-slate-600">
            This page is not available on this domain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700 text-center">
            You can only access specific services on this domain. Please use one of the available options below.
          </p>
          
          <div className="space-y-3">
            <Link href="/boiler" className="block">
              <Button className="w-full bg-slate-700 hover:bg-slate-800 text-white">
                Boiler Services
              </Button>
            </Link>
            
            <Link href="/solar" className="block">
              <Button className="w-full bg-slate-700 hover:bg-slate-800 text-white">
                Solar Services
              </Button>
            </Link>
          </div>
          
          <div className="text-center pt-4">
            <p className="text-sm text-slate-500">
              Need help? Contact our support team
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
