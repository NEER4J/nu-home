// app/admin/quote-submissions/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'View Quote Submission | Nu-Home Admin',
  description: 'View details of a quote submission'
};

export default async function ViewSubmissionPage({
  params
}: {
  params: { id: string }
}) {
  try {
    const supabase = await createClient();
    
    // Fetch the submission
    const { data: submission, error } = await supabase
      .from('QuoteSubmissions')
      .select(`
        *,
        ServiceCategories (
          name,
          slug
        )
      `)
      .eq('submission_id', params.id)
      .single();
    
    if (error || !submission) {
      notFound();
    }
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">View Quote Submission</h1>
          <div className="flex space-x-3">
            <Link
              href={`/admin/quote-submissions/${params.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Edit Submission
            </Link>
            <Link
              href="/admin/quote-submissions"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Submissions
            </Link>
          </div>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Submission Information
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Details and form answers.
              </p>
            </div>
            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium
              ${submission.status === 'new' ? 'bg-green-100 text-green-800' : 
                submission.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                submission.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                submission.status === 'disqualified' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'}`
            }>
              {submission.status}
            </span>
          </div>
          
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Submission ID
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {submission.submission_id}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Service Category
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {submission.ServiceCategories?.name || 'Unknown'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Submission Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(submission.submission_date).toLocaleString()}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Full Name
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {submission.first_name} {submission.last_name}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Email Address
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <a href={`mailto:${submission.email}`} className="text-blue-600 hover:text-blue-800">
                    {submission.email}
                  </a>
                </dd>
              </div>
              {submission.phone && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Phone Number
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <a href={`tel:${submission.phone}`} className="text-blue-600 hover:text-blue-800">
                      {submission.phone}
                    </a>
                  </dd>
                </div>
              )}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Location
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {submission.city ? `${submission.city}, ` : ''}{submission.postcode}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  IP Address
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {submission.ip_address || 'Not recorded'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Referral Source
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {submission.referral_source || 'Direct'}
                </dd>
              </div>
              
              {submission.notes && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Notes
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {submission.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
        
        {/* Form Answers */}
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Form Answers
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Customer responses to form questions.
            </p>
          </div>
          
          <div className="border-t border-gray-200">
            <dl>
              {submission.form_answers && submission.form_answers.length > 0 ? (
                submission.form_answers.map((answer: any, index: number) => (
                  <div key={answer.question_id} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}>
                    <dt className="text-sm font-medium text-gray-500">
                      {answer.question_text}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {typeof answer.answer === 'string' ? (
                        answer.answer
                      ) : Array.isArray(answer.answer) ? (
                        answer.answer.join(', ')
                      ) : (
                        JSON.stringify(answer.answer)
                      )}
                    </dd>
                  </div>
                ))
              ) : (
                <div className="bg-white px-4 py-5 sm:px-6">
                  <p className="text-sm text-gray-500">No form answers recorded.</p>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching submission:', error);
    notFound();
  }
}