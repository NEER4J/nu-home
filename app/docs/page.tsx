// app/docs/page.tsx
import { createClient } from '@/utils/supabase/server';
import {
  FileText,
  Shield,
  Settings,
  Users,
  Globe,
  Database,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  Layers,
  User,
  MapPin,
  Blocks,
  Tag,
  Gift,
  Mail,
  Settings2,
  UserRound,
  Grid,
  Megaphone,
  Star,
  ShoppingCart,
  Home,
  AtSign,
  LockIcon,
  ArrowUpRight,
  Search,
  PlusCircle
} from 'lucide-react';

export const metadata = {
  title: 'Documentation | Quote AI',
  description: 'Complete documentation for Quote AI system',
};

export default async function DocumentationPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 p-6 sticky top-0 h-screen overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Quote AI Documentation</h1>
            <p className="text-sm text-gray-600">Complete guide to the Quote AI system</p>
          </div>

          <nav className="space-y-1">
            <a href="#overview" className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 bg-white border-l-2 border-blue-500">
              <span className="mr-3">1</span>
              System Overview
            </a>
            <a href="#auth-flow" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100">
              <span className="mr-3">2</span>
              Authentication Flow
            </a>
            <a href="#admin-section" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100">
              <span className="mr-3">3</span>
              Admin Section
            </a>
            <a href="#partner-section" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100">
              <span className="mr-3">4</span>
              Partner Section
            </a>
            <a href="#boiler-flow" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100">
              <span className="mr-3">5</span>
              Boiler Quote Flow
            </a>
            <a href="#public-flow" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100">
              <span className="mr-3">6</span>
              Public Quote Flow
            </a>
            <a href="#technical-details" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100">
              <span className="mr-3">7</span>
              Technical Details
            </a>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 px-8 py-6 max-w-none">
          <div className="max-w-4xl mx-auto">

          {/* System Overview */}
          <section id="overview" className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">System Overview</h2>

            <p className="text-gray-700 leading-relaxed mb-8">
              Quote AI is a comprehensive platform that connects customers seeking home services and products with qualified service providers (partners). The system features two main user roles with distinct responsibilities and capabilities.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Settings className="w-5 h-5 text-gray-700 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Admin Role</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Platform administrators who manage system configuration, user accounts, service categories, form questions, and oversee all platform activity. They have complete control over content management and system settings.
                </p>
                <div className="text-sm text-gray-600">
                  <strong>Primary Responsibilities:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>System configuration and settings</li>
                    <li>User account management and approval</li>
                    <li>Content creation and form management</li>
                    <li>Platform monitoring and analytics</li>
                  </ul>
                </div>
              </div>

              <div className="border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Users className="w-5 h-5 text-gray-700 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Partner Role</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Service providers who manage their products, services, receive leads, and configure their business settings within the platform. They focus on growing their business through the platform.
                </p>
                <div className="text-sm text-gray-600">
                  <strong>Primary Capabilities:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Product and service catalogue management</li>
                    <li>Lead reception and customer engagement</li>
                    <li>Business profile and settings configuration</li>
                    <li>Custom domain setup and branding</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Key Features & Capabilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Dynamic Quote Forms</div>
                      <div className="text-sm text-gray-600">Customizable forms based on service categories with visual editor</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Lead Management</div>
                      <div className="text-sm text-gray-600">Automatic lead distribution to qualified partners based on location and services</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Product Catalog</div>
                      <div className="text-sm text-gray-600">Partners can showcase their products and services with rich media</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Email Notifications</div>
                      <div className="text-sm text-gray-600">Automated email system for all interactions and status updates</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Custom Domains</div>
                      <div className="text-sm text-gray-600">Partners can use their own domain names with DNS verification</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Integration APIs</div>
                      <div className="text-sm text-gray-600">Connects with external systems (GHL, Stripe, Google Places, etc.)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Authentication Flow */}
          <section id="auth-flow" className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Authentication Flow</h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">User Registration & Login</h3>

                <div className="bg-gray-50 p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <div className="font-medium text-gray-900">Entry Point:</div>
                    <code className="ml-2 px-2 py-1 bg-white rounded text-sm">/sign-in</code>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Users access the platform through a secure login page with email/password authentication powered by Supabase Auth.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 p-6">
                    <h4 className="font-medium text-gray-900 mb-3">New User Registration Flow</h4>
                    <ol className="text-sm text-gray-700 space-y-2">
                      <li>1. Visit <code className="px-1 py-0.5 bg-gray-100 rounded">/sign-in</code></li>
                      <li>2. Click "Sign up" link to access registration form</li>
                      <li>3. Complete registration form with business details</li>
                      <li>4. Account created with 'pending' status in database</li>
                      <li>5. Admin approval required before account activation</li>
                    </ol>
                  </div>

                  <div className="border border-gray-200 p-6">
                    <h4 className="font-medium text-gray-900 mb-3">Existing User Login Flow</h4>
                    <ol className="text-sm text-gray-700 space-y-2">
                      <li>1. Visit <code className="px-1 py-0.5 bg-gray-100 rounded">/sign-in</code></li>
                      <li>2. Enter email and password credentials</li>
                      <li>3. System validates credentials via Supabase Auth</li>
                      <li>4. Check user role from UserProfiles table</li>
                      <li>5. Automatic redirect to appropriate dashboard</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Role-Based Access Control</h3>
                <p className="text-gray-700 mb-4">
                  After successful authentication, users are automatically redirected based on their role stored in the UserProfiles table:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 p-6">
                    <h4 className="font-medium text-gray-900 mb-2">Admin Users</h4>
                    <div className="mb-3">
                      <div className="text-sm text-gray-600">→ Redirected to:</div>
                      <code className="block mt-1 px-2 py-1 bg-gray-100 rounded text-sm">/admin</code>
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      <strong>Full platform management access</strong> - Complete control over system configuration, user management, content creation, and platform monitoring.
                    </div>
                  </div>

                  <div className="border border-gray-200 p-6">
                    <h4 className="font-medium text-gray-900 mb-2">Partner Users</h4>
                    <div className="mb-3">
                      <div className="text-sm text-gray-600">→ Redirected to:</div>
                      <code className="block mt-1 px-2 py-1 bg-gray-100 rounded text-sm">/partner</code>
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      <strong>Business management access</strong> - Focus on product catalogue management, lead reception, customer engagement, and business configuration.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Admin Section */}
          <section id="admin-section" className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Admin Section</h2>

            <p className="text-gray-700 leading-relaxed mb-8">
              Administrators have complete control over the platform configuration, user management, and content management through a comprehensive dashboard interface.
            </p>

            <div className="mb-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Management Sections</h3>
                <div className="space-y-3">
                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <FileText className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Form Questions</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Advanced form builder with visual editor for creating dynamic quote forms</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Visual form builder interface</li>
                          <li>Question types: text, select, checkbox, radio, date, number</li>
                          <li>Conditional logic and field dependencies</li>
                          <li>Category-specific form templates</li>
                          <li>Form preview and testing</li>
                          <li>Bulk import/export functionality</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /admin/form-questions</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Layers className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Service Categories</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Create and manage service categories that define available services</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Category creation with icons and descriptions</li>
                          <li>Slug-based URL generation</li>
                          <li>Field mapping configuration</li>
                          <li>Partner access request management</li>
                          <li>Category status management (active/inactive)</li>
                          <li>Bulk operations for multiple categories</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /admin/service-categories</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Users className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Partners</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Comprehensive partner account management and approval system</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Partner registration approval workflow</li>
                          <li>Detailed profile management</li>
                          <li>Service category access control</li>
                          <li>Performance analytics and statistics</li>
                          <li>Account status management (active/suspended/pending)</li>
                          <li>Lead assignment and tracking</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /admin/partners</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Package className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Products</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Centralised product catalogue management across all partners</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Admin product catalogue management</li>
                          <li>Partner product oversight</li>
                          <li>Product approval workflow</li>
                          <li>Category-based organisation</li>
                          <li>Image and media management</li>
                          <li>Pricing and availability tracking</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /admin/products</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Blocks className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Addons</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Manage supplementary services and product add-ons</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Addon service creation and editing</li>
                          <li>Pricing configuration</li>
                          <li>Compatibility rules with main products</li>
                          <li>Partner addon management</li>
                          <li>Bulk operations for addon management</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /admin/addons</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <MapPin className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Field Mappings</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Configure data field mappings for external system integrations</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>CRM field mapping (GoHighLevel)</li>
                          <li>Email template field configuration</li>
                          <li>API response field mapping</li>
                          <li>Test mapping functionality</li>
                          <li>Bulk field mapping operations</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /admin/field-mappings</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Layers className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Category Requests</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Manage partner requests for service category access</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Review and approve partner category requests</li>
                          <li>Request status management (pending/approved/rejected)</li>
                          <li>Category availability checking</li>
                          <li>Bulk approval/rejection operations</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /admin/category-requests</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Workflow</h3>
              <div className="bg-gray-50 p-4">
                <ol className="list-decimal list-inside text-gray-700 space-y-2 text-sm">
                  <li><strong>Partner Registration:</strong> New partners register and await admin approval in pending status</li>
                  <li><strong>Category Requests:</strong> Partners request access to specific service categories for their business</li>
                  <li><strong>Content Management:</strong> Admins create and update form questions and service categories as needed</li>
                  <li><strong>Lead Distribution:</strong> System automatically assigns customer leads to qualified partners based on location and services</li>
                  <li><strong>Platform Monitoring:</strong> Admins monitor system health, user activity, and overall platform performance</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Partner Section */}
          <section id="partner-section" className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Partner Section</h2>

            <p className="text-gray-700 leading-relaxed mb-8">
              Partners use this section to manage their business profile, products, services, and customer leads through an intuitive dashboard interface.
            </p>

            <div className="mb-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Partner Tools & Features</h3>
                <div className="space-y-3">
                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Package className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">My Products</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Personal product catalogue management for partner's business offerings</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Product creation and editing with rich media</li>
                          <li>Image upload and gallery management</li>
                          <li>Pricing configuration and availability settings</li>
                          <li>Category assignment and organisation</li>
                          <li>Product status management (active/inactive)</li>
                          <li>Bulk operations for multiple products</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/my-products</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Blocks className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Addons</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Manage supplementary services that complement main product offerings</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Addon service creation and management</li>
                          <li>Pricing and compatibility configuration</li>
                          <li>Association with main products</li>
                          <li>Visibility and availability controls</li>
                          <li>Performance tracking and analytics</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/addons</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Users className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Leads</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Customer relationship management with lead tracking and communication</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Lead inbox with filtering and search</li>
                          <li>Contact information and requirements display</li>
                          <li>Lead status tracking (new, contacted, quoted, converted)</li>
                          <li>Communication history and notes</li>
                          <li>Export functionality for external CRM</li>
                          <li>Performance metrics and conversion tracking</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/leads</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Layers className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Services</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Request and manage access to different service categories</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Browse available service categories</li>
                          <li>Request access to new categories</li>
                          <li>View pending and approved access</li>
                          <li>Manage existing service permissions</li>
                          <li>Category-specific settings configuration</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/category-access</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Settings className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Configuration</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Comprehensive service configuration with multiple tabs for detailed settings</p>

                    <div className="space-y-3 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">General Settings Tab:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>APR Settings - Configure financing terms and rates</li>
                          <li>Payment Settings - Enable Stripe, Kanda Finance, monthly payments, pay-after-installation</li>
                          <li>Admin Email - Set notification email for leads</li>
                          <li>GTM Event - Configure Google Tag Manager events</li>
                          <li>Main Page URL - Set primary business website</li>
                          <li>Calendar Integration - Connect GoHighLevel calendars for bookings</li>
                        </ul>
                      </div>

                      <div className="text-sm">
                        <strong className="text-gray-900">Service Details Tab:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>What's Included - List items included in service</li>
                          <li>What's Not Included - Set clear expectations for exclusions</li>
                          <li>Dynamic lists with add/remove functionality</li>
                        </ul>
                      </div>

                      <div className="text-sm">
                        <strong className="text-gray-900">FAQs Tab:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Add/edit frequently asked questions</li>
                          <li>Question and answer pairs for customer clarity</li>
                          <li>Displayed on service pages to reduce support queries</li>
                        </ul>
                      </div>

                      <div className="text-sm">
                        <strong className="text-gray-900">Content Sections Tab:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Review Section - Customer testimonials and ratings</li>
                          <li>Google Reviews Import - Pull reviews from Google Business</li>
                          <li>Main CTA - Call-to-action configuration between products</li>
                          <li>Pagination for managing multiple reviews</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/configuration</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Tag className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Admin Products</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Browse and select from the centralised admin product catalogue</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Browse all available products from admin catalogue</li>
                          <li>Add products to personal catalogue</li>
                          <li>Product comparison and selection</li>
                          <li>Category-based filtering</li>
                          <li>Product availability checking</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/admin-products</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Gift className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Admin Addons</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Browse and select supplementary services from admin addon catalogue</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Browse available addon services</li>
                          <li>Add addons to service offerings</li>
                          <li>Compatibility checking with main products</li>
                          <li>Pricing and terms review</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/admin-addons</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Megaphone className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Highlights</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Manage business highlights and achievements for marketing</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Create and edit business highlights</li>
                          <li>Add achievements and certifications</li>
                          <li>Display on public-facing pages</li>
                          <li>Highlight key differentiators</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/highlights</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Star className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Key Points</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Manage key selling points and unique value propositions</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Create compelling selling points</li>
                          <li>Highlight competitive advantages</li>
                          <li>Display on product and service pages</li>
                          <li>Improve conversion rates</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/key-points</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Mail className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Notifications</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Manage email notification preferences and history</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Email notification settings</li>
                          <li>Notification history and logs</li>
                          <li>Delivery status tracking</li>
                          <li>Template management</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/notifications</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Settings className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Settings</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Account settings and profile management</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Profile information management</li>
                          <li>Business details configuration</li>
                          <li>Notification preferences</li>
                          <li>Account security settings</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/settings</div>
                  </div>

                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center mb-2">
                      <Layers className="w-4 h-4 text-gray-700 mr-2" />
                      <h4 className="font-medium text-gray-900">Import</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Import data and manage bulk operations</p>

                    <div className="space-y-2 mb-3">
                      <div className="text-sm">
                        <strong className="text-gray-900">Features:</strong>
                        <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                          <li>Bulk data import functionality</li>
                          <li>Data validation and error handling</li>
                          <li>Template download for data formatting</li>
                          <li>Import progress tracking</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /partner/import</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Partner Workflow</h3>
              <div className="bg-gray-50 p-4">
                <ol className="list-decimal list-inside text-gray-700 space-y-2 text-sm">
                  <li><strong>Account Setup:</strong> Complete business profile and request access to relevant service categories</li>
                  <li><strong>Product Management:</strong> Add products and services to catalogue with detailed descriptions and pricing</li>
                  <li><strong>Lead Reception:</strong> Receive customer inquiries automatically distributed by the system</li>
                  <li><strong>Customer Engagement:</strong> Contact leads, provide quotes, and convert to customers</li>
                  <li><strong>Business Growth:</strong> Expand service offerings and product catalogue to reach more customers</li>
                </ol>
              </div>
            </div>
          </section>

        {/* Boiler Quote Flow */}
        <section id="boiler-flow" className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Boiler Quote Flow</h2>

          <p className="text-gray-700 leading-relaxed mb-8">
            Comprehensive boiler services quote system with multi-step forms, OTP verification, and complete product showcase.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quote Collection Process</h3>

              <div className="space-y-4">
                <div className="border border-gray-200 p-4">
                  <div className="flex items-center mb-2">
                    <FileText className="w-4 h-4 text-gray-700 mr-2" />
                    <h4 className="font-medium text-gray-900">Multi-Step Quote Form</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Dynamic form with conditional logic and validation</p>

                  <div className="space-y-2 mb-3">
                    <div className="text-sm">
                      <strong className="text-gray-900">Features:</strong>
                      <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                        <li>Dynamic question loading based on category</li>
                        <li>Conditional logic for showing/hiding questions</li>
                        <li>Real-time form validation</li>
                        <li>Progress tracking across multiple steps</li>
                        <li>Address selection with Google Places integration</li>
                        <li>Contact information collection</li>
                        <li>OTP verification for enhanced security</li>
                      </ul>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /boiler/quote</div>
                </div>

                <div className="border border-gray-200 p-4">
                  <div className="flex items-center mb-2">
                    <Package className="w-4 h-4 text-gray-700 mr-2" />
                    <h4 className="font-medium text-gray-900">Products Display</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Comprehensive product showcase with financing options</p>

                  <div className="space-y-2 mb-3">
                    <div className="text-sm">
                      <strong className="text-gray-900">Features:</strong>
                      <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                        <li>Dynamic product loading from database</li>
                        <li>Interactive image galleries</li>
                        <li>Finance calculator integration</li>
                        <li>Specifications dropdown</li>
                        <li>Review sections and testimonials</li>
                        <li>Main CTA configuration</li>
                        <li>Partner branding and customisation</li>
                      </ul>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /boiler/products</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Post-Quote Experience</h3>

              <div className="space-y-4">
                <div className="border border-gray-200 p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-4 h-4 text-gray-700 mr-2" />
                    <h4 className="font-medium text-gray-900">Enquiry Confirmation</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Thank you page after successful quote submission</p>

                  <div className="space-y-2 mb-3">
                    <div className="text-sm">
                      <strong className="text-gray-900">Features:</strong>
                      <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                        <li>Partner information display</li>
                        <li>Next steps communication</li>
                        <li>Contact method preferences</li>
                        <li>Confirmation email notification</li>
                        <li>Return to products option</li>
                      </ul>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /boiler/enquiry</div>
                </div>

                <div className="border border-gray-200 p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-4 h-4 text-gray-700 mr-2" />
                    <h4 className="font-medium text-gray-900">Success Page</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Final confirmation after completed quote process</p>

                  <div className="space-y-2 mb-3">
                    <div className="text-sm">
                      <strong className="text-gray-900">Features:</strong>
                      <ul className="list-disc list-inside text-gray-600 mt-1 ml-2">
                        <li>Quote completion confirmation</li>
                        <li>Next steps guidance</li>
                        <li>Contact information summary</li>
                        <li>Return to partner dashboard</li>
                      </ul>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Routes: /boiler/success</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Boiler Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border border-gray-200 p-4 text-center">
                <div className="font-medium text-gray-900 mb-1">Survey System</div>
                <div className="text-sm text-gray-600">Customer satisfaction surveys</div>
                <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Routes: /boiler/survey</div>
              </div>

              <div className="border border-gray-200 p-4 text-center">
                <div className="font-medium text-gray-900 mb-1">Checkout Process</div>
                <div className="text-sm text-gray-600">Payment processing and order completion</div>
                <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Routes: /boiler/checkout</div>
              </div>

              <div className="border border-gray-200 p-4 text-center">
                <div className="font-medium text-gray-900 mb-1">Addon Services</div>
                <div className="text-sm text-gray-600">Supplementary boiler services</div>
                <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Routes: /boiler/addons</div>
              </div>
            </div>
          </div>
        </section>

        {/* Public Quote Flow */}
        <section id="public-flow" className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Public Quote Flow</h2>

          <p className="text-gray-700 leading-relaxed mb-8">
            This section describes how customers interact with the public-facing quote system to request services and get connected with qualified partners.
          </p>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Pages & Customer Journey</h3>

                <div className="bg-gray-50 p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <div className="font-medium text-gray-900">Dynamic Routing System:</div>
                    <code className="ml-2 px-2 py-1 bg-white rounded text-sm">/services/[slug]</code>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Each service category has its own dedicated page with dynamically generated forms based on the category's specific requirements and questions.
                  </p>
                </div>

                <div className="border border-gray-200 p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Customer Quote Request Flow</h4>
                  <ol className="text-sm text-gray-700 space-y-2">
                    <li>1. Customer discovers service page through search or navigation</li>
                    <li>2. Dynamic form loads with category-specific questions and fields</li>
                    <li>3. Customer fills out detailed requirements, contact info, and preferences</li>
                    <li>4. Form validates input and submits to the lead distribution system</li>
                    <li>5. Lead automatically distributed to qualified partners based on location and services</li>
                  </ol>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Partner Notification System</h3>

                <div className="border border-gray-200 p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Partner Notification Process</h4>
                  <ol className="text-sm text-gray-700 space-y-2">
                    <li>1. Lead automatically assigned to qualified partners based on service category and location</li>
                    <li>2. Email notification sent to partner's registered email address</li>
                    <li>3. Partner receives in-app notification in their dashboard</li>
                    <li>4. Partner can view lead details and contact information</li>
                    <li>5. Partner initiates contact and begins quote process with customer</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Points & Automation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">Email System</div>
                  <div className="text-sm text-gray-600">Automated email notifications for all interactions</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">SMTP Integration</div>
                </div>

                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">Payment Processing</div>
                  <div className="text-sm text-gray-600">Secure payment processing for quotes</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Stripe Integration</div>
                </div>

                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">CRM Integration</div>
                  <div className="text-sm text-gray-600">Lead sync with CRM systems</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">GoHighLevel Sync</div>
                </div>

                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">Address Services</div>
                  <div className="text-sm text-gray-600">Location-based lead distribution</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Google Places API</div>
                </div>

                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">Review Management</div>
                  <div className="text-sm text-gray-600">Customer review collection</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Google Reviews API</div>
                </div>

                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">AI Assistance</div>
                  <div className="text-sm text-gray-600">AI-powered lead processing</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Kanda Integration</div>
                </div>
              </div>
            </div>
          </div>
        </section>

          {/* Technical Details */}
          <section id="technical-details" className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Technical Details</h2>

            <div className="grid grid-cols-1 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Technology Stack</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Frontend Framework</div>
                        <div className="text-sm text-gray-600">Next.js 15, React 18, TypeScript</div>
                      </div>
                    </div>
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Latest</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Styling Framework</div>
                        <div className="text-sm text-gray-600">Tailwind CSS with custom design system</div>
                      </div>
                    </div>
                    <div className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded">Responsive</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Backend Runtime</div>
                        <div className="text-sm text-gray-600">Next.js API Routes with Server Components</div>
                      </div>
                    </div>
                    <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Serverless</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Database</div>
                        <div className="text-sm text-gray-600">Supabase (PostgreSQL) with real-time subscriptions</div>
                      </div>
                    </div>
                    <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Cloud</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Authentication</div>
                        <div className="text-sm text-gray-600">Supabase Auth with JWT tokens</div>
                      </div>
                    </div>
                    <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Secure</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security Features</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Row Level Security (RLS)</div>
                      <div className="text-sm text-gray-600">Database-level access control in Supabase</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Role-Based Access Control</div>
                      <div className="text-sm text-gray-600">Frontend and API-level permission management</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Secure API Routes</div>
                      <div className="text-sm text-gray-600">Authentication middleware on all endpoints</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Data Encryption</div>
                      <div className="text-sm text-gray-600">Sensitive data encrypted at rest and in transit</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-gray-900">Custom Domain Verification</div>
                      <div className="text-sm text-gray-600">DNS verification for partner domains</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">API Integrations & External Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">GoHighLevel</div>
                  <div className="text-sm text-gray-600">CRM and marketing automation platform</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Lead Sync</div>
                </div>

                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">Stripe</div>
                  <div className="text-sm text-gray-600">Payment processing and billing</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">PCI Compliant</div>
                </div>

                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">Google Places</div>
                  <div className="text-sm text-gray-600">Address autocomplete and validation</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Location Services</div>
                </div>

                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">Email Service</div>
                  <div className="text-sm text-gray-600">SMTP-based email notifications</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Transactional</div>
                </div>

                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">Google Reviews</div>
                  <div className="text-sm text-gray-600">Customer review management</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Reputation</div>
                </div>

                <div className="border border-gray-200 p-4 text-center">
                  <div className="font-medium text-gray-900 mb-1">Kanda AI</div>
                  <div className="text-sm text-gray-600">AI-powered lead processing and assistance</div>
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">Machine Learning</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-8 mt-16">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Need Help?</h3>
            <p className="text-gray-600 text-sm mb-4 max-w-2xl mx-auto">
              This comprehensive documentation covers the complete Quote AI system architecture, workflows, and technical details. For technical support, feature requests, or additional information, please contact the development team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm text-gray-500">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Version 1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

      {/* Smooth scroll script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
              e.preventDefault();
              const target = document.querySelector(this.getAttribute('href'));
              if (target) {
                target.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              }
            });
          });
        `
      }} />
    </div>
  );
}
