import React from "react";

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur border-b border-slate-900/10 dark:border-slate-50/[0.06] bg-white/75 dark:bg-slate-900/75">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">NuHome Documentation</span>
          </div>
        </div>
      </nav>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            NuHome Platform Documentation
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
            A comprehensive marketplace solution connecting service providers with customers through a seamless digital experience. Our platform offers powerful tools for both administrators and partners to manage products, services, and customer interactions.
          </p>
        </div>

        {/* Feature Overview Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Core Features</h2>
          
          {/* Authentication */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Authentication
            </h3>
            <div className="bg-blue-50 dark:bg-slate-800/60 rounded-lg border border-blue-100 dark:border-slate-700 p-6">
              <p className="text-slate-600 dark:text-slate-400">Secure role-based access control system powered by Supabase Auth:</p>
              <ul className="mt-4 space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Separate login flows for administrators and partners
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Role-based access control and permissions
                </li>
              </ul>
            </div>
          </div>

          {/* Admin Features */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              Admin Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product Management</h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li>• Add, edit, and remove products in the database</li>
                  <li>• Manage product categories and classifications</li>
                  <li>• Track product ownership and partner attribution</li>
                </ul>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Form Management</h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li>• Create and edit quote form questions</li>
                  <li>• Set up conditional logic based on categories</li>
                  <li>• Configure custom fields per category</li>
                </ul>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Partner Management</h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li>• Approve/deny partner registrations</li>
                  <li>• Manage category access permissions</li>
                  <li>• Review category access requests</li>
                </ul>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Quote Management</h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li>• View all quote submissions</li>
                  <li>• Track submission status</li>
                  <li>• Manage customer inquiries</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Partner Features */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Partner Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product Management</h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li>• Import products from WordPress</li>
                  <li>• Add products from main catalog</li>
                  <li>• Manage own product listings</li>
                </ul>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Category Access</h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li>• Request access to new categories</li>
                  <li>• Manage existing category access</li>
                  <li>• View access status</li>
                </ul>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Lead Management</h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li>• View quote submissions</li>
                  <li>• Manage customer inquiries</li>
                  <li>• Track submission status</li>
                </ul>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Branding</h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li>• Custom subdomain management</li>
                  <li>• Partner-specific product pages</li>
                  <li>• Branded marketplace presence</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quote Forms */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Dynamic Quote Forms
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                <li className="flex items-start">
                  <svg className="w-4 h-4 mt-1 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Category-specific form generation with custom fields
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mt-1 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Conditional logic based on user responses
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mt-1 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Automated submission routing to relevant partners
                </li>
              </ul>
            </div>
          </div>

          {/* Workflow Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Platform Workflows</h2>
            <div className="space-y-8">
              {/* Customer Flow */}
              <div className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800/60 dark:to-slate-900 rounded-lg border border-blue-100 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Customer Journey</h3>
                <ol className="space-y-4">
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mr-3 mt-0.5">1</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Visit Website</p>
                      <p className="text-slate-600 dark:text-slate-400">Land on homepage or browse categories</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mr-3 mt-0.5">2</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Product Discovery</p>
                      <p className="text-slate-600 dark:text-slate-400">Browse products, view details and partner information</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mr-3 mt-0.5">3</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Quote Request</p>
                      <p className="text-slate-600 dark:text-slate-400">Submit quote request via dynamic form</p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Partner Flow */}
              <div className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800/60 dark:to-slate-900 rounded-lg border border-blue-100 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Partner Journey</h3>
                <ol className="space-y-4">
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mr-3 mt-0.5">1</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Account Setup</p>
                      <p className="text-slate-600 dark:text-slate-400">Register and configure partner profile</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mr-3 mt-0.5">2</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Product Management</p>
                      <p className="text-slate-600 dark:text-slate-400">Import or add products, manage listings</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mr-3 mt-0.5">3</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Lead Management</p>
                      <p className="text-slate-600 dark:text-slate-400">Review and respond to quote requests</p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Admin Flow */}
              <div className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800/60 dark:to-slate-900 rounded-lg border border-blue-100 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Admin Journey</h3>
                <ol className="space-y-4">
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mr-3 mt-0.5">1</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Platform Management</p>
                      <p className="text-slate-600 dark:text-slate-400">Configure categories and form questions</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mr-3 mt-0.5">2</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Partner Oversight</p>
                      <p className="text-slate-600 dark:text-slate-400">Manage partner access and permissions</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mr-3 mt-0.5">3</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">System Monitoring</p>
                      <p className="text-slate-600 dark:text-slate-400">Review platform activity and submissions</p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Routes Documentation */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Platform Routes</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Admin Routes */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Admin Routes</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/admin</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Dashboard landing page</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/admin/products</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Product management</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/admin/form-questions</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Form configuration</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/admin/quote-submissions</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Quote management</p>
                  </div>
                </div>
              </div>

              {/* Partner Routes */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Partner Routes</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/partner</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Partner dashboard</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/partner/import</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Product import tool</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/partner/my-products</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Product management</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/partner/category-access</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Category permissions</p>
                  </div>
                </div>
              </div>

              {/* Public Routes */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Public Routes</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/category/[category]/products</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Category product listings</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/category/[category]/quote</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Category quote forms</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/service/[category]/products</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Marketplace view</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">/service/[category]/addons</code>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Category add-ons</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-900/10 dark:border-slate-50/[0.06] pt-8">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            NuHome Platform Documentation © {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}
