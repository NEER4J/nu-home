'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { FieldMapper } from '@/components/import/FieldMapper';
import { ProductPreview } from '@/components/import/ProductPreview';
import { importProducts } from './actions';
import { useRouter } from 'next/navigation';

interface WordPressProduct {
  id: number;
  slug: string;
  status: string;
  type: string;
  title: {
    rendered: string;
  };
  featured_media: number;
  boilertype: number[];
  bedroom_fits_boiler: number[];
  acf: {
    subtitle_1: string;
    year_warranty: string;
    select_brand: string;
    boiler_description: Array<{ description_item: string }>;
    boiler_fixed_price: number;
    boiler_power_price: Array<{
      price: number;
      power: string;
      flow_rate: string;
    }>;
    boiler_flow_rate: string;
    boiler_dimetions: {
      height: string;
      width: string;
      depth: string;
    };
    boiler_details: Array<{
      icon: number;
      text: string;
    }>;
  };
}

interface ServiceCategory {
  service_category_id: string;
  name: string;
  slug: string;
  fields: CategoryField[];
}

interface CategoryField {
  field_id: string;
  name: string;
  key: string;
  field_type: string;
  is_required: boolean;
  display_order: number;
  options: any;
  display_format: string;
  is_multi: boolean;
}

interface FieldMapping {
  [key: string]: string;
}

const databaseFields = [
  { key: 'name', label: 'Product Name', type: 'string', required: true },
  { key: 'slug', label: 'Slug', type: 'string', required: true },
  { key: 'description', label: 'Description', type: 'text', required: true },
  { key: 'price', label: 'Price', type: 'number', required: false },
  { key: 'image_url', label: 'Image URL', type: 'string', required: false },
  { key: 'specifications', label: 'Specifications', type: 'jsonb', required: true },
  { key: 'product_fields', label: 'Product Fields', type: 'jsonb', required: true },
  { key: 'is_active', label: 'Active', type: 'boolean', required: true },
];

const getWordPressFields = (product: WordPressProduct) => {
  return [
    // Global fields
    { path: 'title.rendered', label: 'Product Name', type: 'string' },
    { path: 'slug', label: 'Slug', type: 'string' },
    { path: 'status', label: 'Status', type: 'select', options: ['publish', 'draft'] },
    { path: 'type', label: 'Product Type', type: 'string' },
    { path: 'featured_media', label: 'Featured Media ID', type: 'number' },
    
    // Taxonomies
    { 
      path: 'boilertype', 
      label: 'Boiler Types', 
      type: 'array',
      options: ['24'] // You might want to fetch these from WordPress
    },
    { 
      path: 'bedroom_fits_boiler', 
      label: 'Bedroom Fits', 
      type: 'array',
      options: ['25', '26', '27', '28', '29', '30'] // You might want to fetch these from WordPress
    },
    
    // ACF Fields
    { path: 'acf.subtitle_1', label: 'Subtitle', type: 'string' },
    { path: 'acf.year_warranty', label: 'Warranty Years', type: 'string' },
    { path: 'acf.select_brand', label: 'Brand', type: 'string' },
    { 
      path: 'acf.boiler_description', 
      label: 'Description Items', 
      type: 'repeater',
      subfields: [
        { key: 'description_item', label: 'Description Item', type: 'text' }
      ]
    },
    { path: 'acf.boiler_fixed_price', label: 'Fixed Price', type: 'number' },
    { 
      path: 'acf.boiler_power_price', 
      label: 'Power & Price Options', 
      type: 'repeater',
      subfields: [
        { key: 'price', label: 'Price', type: 'number' },
        { key: 'power', label: 'Power', type: 'string' },
        { key: 'flow_rate', label: 'Flow Rate', type: 'string' }
      ]
    },
    { path: 'acf.boiler_flow_rate', label: 'Flow Rate', type: 'string' },
    { 
      path: 'acf.boiler_dimetions', 
      label: 'Dimensions', 
      type: 'object',
      subfields: [
        { key: 'height', label: 'Height', type: 'string' },
        { key: 'width', label: 'Width', type: 'string' },
        { key: 'depth', label: 'Depth', type: 'string' }
      ]
    },
    { 
      path: 'acf.boiler_details', 
      label: 'Boiler Details', 
      type: 'repeater',
      subfields: [
        { key: 'icon', label: 'Icon ID', type: 'number' },
        { key: 'text', label: 'Text', type: 'string' }
      ]
    }
  ];
};

// Helper function to transform field values based on their type
const transformFieldValue = (value: any, field: any) => {
  if (!value) return null;

  switch (field.type) {
    case 'repeater':
      if (!Array.isArray(value)) return [];
      return value.map(item => {
        const transformed: any = {};
        field.subfields.forEach((subfield: any) => {
          transformed[subfield.key] = item[subfield.key];
        });
        return transformed;
      });

    case 'object':
      const transformed: any = {};
      field.subfields.forEach((subfield: any) => {
        transformed[subfield.key] = value[subfield.key];
      });
      return transformed;

    case 'checkbox':
      return Array.isArray(value) ? value : [value];

    case 'select':
      return value;

    case 'number':
      return parseFloat(value) || 0;

    default:
      return value;
  }
};

const WP_API_FIELDS = [
  'id',
  'slug',
  'status',
  'type',
  'title',
  'featured_media',
  'boilertype',
  'bedroom_fits_boiler',
  'acf',
  'acf.subtitle_1',
  'acf.year_warranty',
  'acf.select_brand',
  'acf.boiler_description',
  'acf.boiler_fixed_price',
  'acf.boiler_power_price',
  'acf.boiler_flow_rate',
  'acf.boiler_dimetions',
  'acf.boiler_details'
].join(',');

export default function ImportPage() {
  const [apiUrl, setApiUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<WordPressProduct[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [activeTab, setActiveTab] = useState('url');
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<WordPressProduct | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchServiceCategories();
  }, []);

  const fetchServiceCategories = async () => {
    try {
      const response = await fetch('/api/service-categories');
      if (!response.ok) throw new Error('Failed to fetch service categories');
      const data = await response.json();
      setServiceCategories(data);
    } catch (err) {
      console.error('Error fetching service categories:', err);
      setError('Failed to load service categories');
    }
  };

  const fetchProducts = async () => {
    if (!selectedCategory || !apiUrl) {
      alert('Please select a category and enter API URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
      setActiveTab('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingChange = (newMapping: FieldMapping) => {
    setFieldMapping(newMapping);
  };

  const handleImport = async () => {
    if (!products || !fieldMapping || !selectedCategory) return;

    try {
      setIsImporting(true);
      const baseUrl = apiUrl.split('/wp-json')[0]; // Extract base URL from API URL
      const result = await importProducts(
        products,
        fieldMapping,
        selectedCategory,
        baseUrl
      );
      
      if (result.success) {
        alert(`Successfully imported ${result.count} products`);
        router.push('/partner/my-products');
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import products: ' + (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCategoryData = serviceCategories.find(cat => cat.service_category_id === selectedCategory);

  const tabs = [
    { id: 'url', label: '1. Enter URL & Category' },
    { id: 'preview', label: '2. Preview Data' },
    { id: 'mapping', label: '3. Map Fields' },
    { id: 'review', label: '4. Review & Save' }
  ];

  const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);

  const goToNextTab = () => {
    const nextTab = tabs[currentTabIndex + 1];
    if (nextTab) {
      setActiveTab(nextTab.id);
    }
  };

  const goToPreviousTab = () => {
    const previousTab = tabs[currentTabIndex - 1];
    if (previousTab) {
      setActiveTab(previousTab.id);
    }
  };

  const constructApiUrl = (baseUrl: string) => {
    // Remove trailing slash if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/wp-json/wp/v2/product_new?_fields=${WP_API_FIELDS}&per_page=100`;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold">Import Products from WordPress</h1>
          <p className="text-gray-600 mt-1">
            Import products from your WordPress site by providing the API URL and mapping the fields.
          </p>
        </div>
        <div className="p-6">
          <div className="border-b mb-4">
            <nav className="flex space-x-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={
                    (tab.id === 'preview' && !products.length) ||
                    (tab.id === 'mapping' && !products.length) ||
                    (tab.id === 'review' && !Object.keys(fieldMapping).length)
                  }
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <p className="text-sm text-blue-700">
                  Enter your WordPress site URL (e.g., https://your-site.com). We'll automatically construct the API URL to fetch all necessary product data.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700">
                  WordPress Site URL
                </label>
                <input
                  id="baseUrl"
                  type="text"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="https://your-site.com"
                  value={apiUrl}
                  onChange={(e) => {
                    const baseUrl = e.target.value;
                    setApiUrl(baseUrl);
                  }}
                  required
                />
                {apiUrl && (
                  <div className="mt-2 text-sm text-gray-500">
                    <p>API URL that will be used:</p>
                    <code className="mt-1 block bg-gray-50 p-2 rounded text-xs break-all">
                      {constructApiUrl(apiUrl)}
                    </code>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Service Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Select a category</option>
                  {serviceCategories.map((category) => (
                    <option key={category.service_category_id} value={category.service_category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between mt-6">
                <div></div>
                <button
                  onClick={() => {
                    const constructedUrl = constructApiUrl(apiUrl);
                    setApiUrl(constructedUrl);
                    fetchProducts();
                  }}
                  disabled={isLoading || !apiUrl || !selectedCategory}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Fetch Products & Continue
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Fetched Products ({products.length})</h3>
                <div className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <div key={product.id} className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium">{product.title.rendered}</h4>
                          <div className="mt-1 text-sm text-gray-500">
                            Price: £{product.acf.boiler_fixed_price} | Status: {product.status}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}
                          className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                        >
                          {selectedProduct?.id === product.id ? 'Hide Details' : 'Show Details'}
                        </button>
                      </div>
                      
                      {selectedProduct?.id === product.id && (
                        <div className="mt-4 bg-gray-50 p-4 rounded-md">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium text-gray-500">ID</div>
                              <div>{product.id}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-500">Slug</div>
                              <div>{product.slug}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-500">Type</div>
                              <div>{product.type}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-500">Status</div>
                              <div>{product.status}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-500">Featured Media ID</div>
                              <div>{product.featured_media}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-500">Brand</div>
                              <div>{product.acf.select_brand}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-500">Subtitle</div>
                              <div>{product.acf.subtitle_1 || 'N/A'}</div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="text-sm font-medium text-gray-500">Boiler Types</div>
                            <div className="mt-1">
                              {product.boilertype.map((type, index) => (
                                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="text-sm font-medium text-gray-500">Bedroom Fits</div>
                            <div className="mt-1">
                              {product.bedroom_fits_boiler.map((fit, index) => (
                                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                                  {fit}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="text-sm font-medium text-gray-500">Description</div>
                            <div className="mt-1">
                              {product.acf.boiler_description.map((item, index) => (
                                <div key={index} className="text-sm">• {item.description_item}</div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="text-sm font-medium text-gray-500">Pricing</div>
                            <div className="mt-1 text-sm">
                              <div>Fixed Price: £{product.acf.boiler_fixed_price}</div>
                              <div className="mt-2">
                                <div className="font-medium">Power & Price Options:</div>
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                  {product.acf.boiler_power_price.map((option, index) => (
                                    <div key={index} className="bg-white p-2 rounded border">
                                      <div>Power: {option.power}</div>
                                      <div>Price: £{option.price}</div>
                                      <div>Flow Rate: {option.flow_rate || 'N/A'}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="text-sm font-medium text-gray-500">Specifications</div>
                            <div className="mt-1 text-sm">
                              <div>Dimensions: {product.acf.boiler_dimetions.height}x{product.acf.boiler_dimetions.width}x{product.acf.boiler_dimetions.depth}</div>
                              <div>Warranty: {product.acf.year_warranty} years</div>
                              <div>Flow Rate: {product.acf.boiler_flow_rate}</div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="text-sm font-medium text-gray-500">Additional Details</div>
                            <div className="mt-1">
                              {product.acf.boiler_details.map((detail, index) => (
                                <div key={index} className="flex items-center text-sm">
                                  <span className="text-gray-500">Icon ID: {detail.icon}</span>
                                  <span className="mx-2">-</span>
                                  <span>{detail.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={goToPreviousTab}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={goToNextTab}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Continue to Field Mapping
                </button>
              </div>
            </div>
          )}

          {activeTab === 'mapping' && selectedCategoryData && (
            <div>
              <FieldMapper
                wordpressFields={getWordPressFields(products[0])}
                databaseFields={(selectedCategoryData.fields || []).map(field => ({
                  key: field.key,
                  label: field.name,
                  type: field.field_type,
                  required: field.is_required
                }))}
                mapping={fieldMapping}
                onMappingChange={handleMappingChange}
              />
              <div className="flex justify-between mt-6">
                <button
                  onClick={goToPreviousTab}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={goToNextTab}
                  disabled={!Object.keys(fieldMapping).length}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  Continue to Review
                </button>
              </div>
            </div>
          )}

          {activeTab === 'review' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <p className="text-sm text-blue-700">
                  Review your products before importing. You can go back to previous steps to make changes if needed.
                </p>
              </div>
              <ProductPreview products={products} mapping={fieldMapping} />
              <div className="flex justify-between mt-6">
                <button
                  onClick={goToPreviousTab}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back to Mapping
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Import Products
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 