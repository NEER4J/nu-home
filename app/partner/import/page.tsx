'use client';

import { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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

const globalFields = [
  { key: 'name', label: 'Product Name', type: 'string', required: true },
  { key: 'slug', label: 'Slug', type: 'string', required: true },
  { key: 'description', label: 'Description', type: 'text', required: true },
  { key: 'price', label: 'Price', type: 'number', required: false },
  { key: 'image_url', label: 'Image URL', type: 'string', required: false },
  { key: 'product_fields', label: 'Product Fields', type: 'jsonb', required: true },
  { key: 'is_active', label: 'Active', type: 'boolean', required: true },
];

const getWordPressFields = (product: WordPressProduct) => {
  // Get all fields from the product object recursively
  const getAllFields = (obj: any, prefix = ''): any[] => {
    return Object.entries(obj).reduce((fields: any[], [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          // Handle array/repeater fields
          fields.push({
            path,
            label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            type: 'repeater',
            subfields: value[0] ? getAllFields(value[0], '') : []
          });
        } else {
          // Handle nested objects
          const subfields = getAllFields(value, '');
          if (subfields.length > 0) {
            fields.push({
              path,
              label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
              type: 'object',
              subfields
            });
          }
        }
      } else {
        // Handle primitive fields
        fields.push({
          path,
          label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          type: typeof value === 'number' ? 'number' : 'string'
        });
      }
      return fields;
    }, []);
  };

  return getAllFields(product);
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

const renderValue = (val: any, depth = 0) => {
  if (val === null || val === undefined) return 'N/A';

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      if (val.length === 0) return 'None';
      return (
        <div className="ml-4">
          {val.map((item, idx) => (
            <div key={idx} className="mt-2">
              {typeof item === 'object' ? renderValue(item, depth + 1) : String(item)}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="ml-4">
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className="mt-2">
            <span className="font-medium">{k}: </span>
            {renderValue(v, depth + 1)}
          </div>
        ))}
      </div>
    );
  }
  return String(val);
};

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
  const [editedProducts, setEditedProducts] = useState<Record<number, any>>({});
  // Only one product open at a time in preview
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const router = useRouter();

  // AI format all products state
  const [aiFormattedAll, setAiFormattedAll] = useState<any[]>([]);
  const [aiFormatAllLoading, setAiFormatAllLoading] = useState(false);
  const [aiFormatAllError, setAiFormatAllError] = useState<string | null>(null);
  const [aiFormatAllProgress, setAiFormatAllProgress] = useState(0);

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
    if (!selectedCategory) {
      alert('Please select a category and enter API URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Use proxy endpoint if the user entered the default WordPress API URL
      let fetchUrl = apiUrl;
      if (
        apiUrl.trim() === '' ||
        apiUrl.trim() === '' ||
        apiUrl.trim() === 'https://example.com/wp-json/wp/v2/products'
      ) {
        fetchUrl = '/api/proxy-endpoint';
      }
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Failed to fetch products');
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

  const handleProductUpdate = (productId: number, updatedData: any) => {
    setEditedProducts(prev => ({
      ...prev,
      [productId]: updatedData
    }));
  };

  const handleImport = async () => {
    if (!products || !fieldMapping || !selectedCategory) return;

    try {
      setIsImporting(true);
      const baseUrl = apiUrl.split('/wp-json')[0];
      
      // Use edited products if available, otherwise use original products
      const productsToImport = products.map(product => 
        editedProducts[product.id] || product
      );

      const result = await importProducts(
        productsToImport,
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

  // Format all products with AI
  const handleFormatAllWithAI = async () => {
    setAiFormatAllLoading(true);
    setAiFormatAllError(null);
    setAiFormattedAll([]);
    setAiFormatAllProgress(0);
    try {
      const results = [];
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const res = await fetch('/api/field-mapping-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wordpressFields: getWordPressFields(product),
            databaseFields: (selectedCategoryData?.fields || []).map(field => ({
              key: field.key,
              label: field.name,
              type: field.field_type,
              required: field.is_required
            })),
            sampleProduct: product,
            mode: 'format',
          }),
        });
        const data = await res.json();
        results.push(data.result);
        setAiFormatAllProgress(Math.round(((i + 1) / products.length) * 100));
      }
      setAiFormattedAll(results);
    } catch (err) {
      setAiFormatAllError('Failed to format all products with AI.');
    } finally {
      setAiFormatAllLoading(false);
      setAiFormatAllProgress(0);
    }
  };

  // After formatting all products, optionally replace the original products with the formatted ones
  useEffect(() => {
    if (aiFormattedAll.length > 0 && aiFormattedAll.length === products.length) {
      setProducts(aiFormattedAll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiFormattedAll]);

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
             
              {/* --- Custom Import Instructions --- */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                <h3 className="text-base font-semibold text-gray-800 mb-2">Reference API URL Example</h3>
                <pre className="bg-white border border-gray-100 rounded px-3 py-2 text-sm text-gray-700 overflow-x-auto mb-2">
                https://origin-gph.com/wp-json/wp/v2/boiler?_fields=slug,status,type,link,title,acf,taxonomy_info,featured_image_src_large,featured_media&per_page=10
                </pre>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  <li>
                    Replace <span className="font-semibold">origin-gph.com</span> with your own domain.
                  </li>
                  <li>
                    The <span className="font-semibold">post_type</span> in the reference domain is <code className="bg-gray-100 px-1 rounded">boiler</code>.
                    Adjust this if your post type is different.
                  </li>
                  <li>
                    Ensure your API endpoint returns the required fields for a successful import.
                  </li>
                  <li>
                    Change per_page value to fetch more then 10 products.
                  </li>
                </ul>
              </div>
              {/* --- End Custom Import Instructions --- */}
              <div className="space-y-2">
                <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700">
                  WordPress API URL
                </label>
                <input
                  id="baseUrl"
                  type="text"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  placeholder="https://your-site.com/wp-json/wp/v2/your-post-type-name?_fields=slug,status,type,link,title,acf,taxonomy_info,featured_image_src_large,featured_media&per_page=100"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Service Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
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
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  {products.map((product) => {
                    const isOpen = selectedProductId === product.id;
                    return (
                      <div
                        key={product.id}
                        className={`transition-shadow duration-200 bg-white border rounded-xl shadow-sm hover:shadow-lg p-4 ${isOpen ? 'ring-2 ring-blue-200' : ''}`}
                      >
                        <button
                          className="flex items-center justify-between w-full focus:outline-none"
                          onClick={() => setSelectedProductId(isOpen ? null : product.id)}
                        >
                          <div className="flex flex-col items-start text-left">
                            <span className="text-lg font-semibold text-gray-900">{product.title.rendered}</span>
                            <span className="text-xs text-gray-500 mt-1">Slug: {product.slug} | Status: {product.status}</span>
                          </div>
                          <span className="ml-2 text-blue-600">
                            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </span>
                        </button>
                        <div
                          className={`overflow-y-scroll overflow-x-hidden transition-all duration-300 ${isOpen ? 'max-h-[400px] mt-4' : 'max-h-0'}`}
                        >
                          {isOpen && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-gray-700 mb-2">Basic Info</h4>
                                <div className="grid grid-cols-1 gap-2">
                                  {Object.entries(product).map(([key, value]) => (
                                    key && value !== undefined && key !== 'acf' && key !== 'boilertype' && key !== 'bedroom_fits_boiler' && key !== 'title' ? (
                                      <div key={key + '-' + String(value ?? '')} className="flex text-sm">
                                        <span className="w-36 font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                                        <span className="ml-2 text-gray-800">{renderValue(value)}</span>
                                      </div>
                                    ) : null
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-700 mb-2">Boiler Type</h4>
                                <div className="flex text-sm">
                                  <span className="w-36 font-medium text-gray-600">boilertype:</span>
                                  <span className="ml-2 text-gray-800">{renderValue(product.boilertype)}</span>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-700 mb-2">Bedroom Fits Boiler</h4>
                                <div className="flex text-sm">
                                  <span className="w-36 font-medium text-gray-600">bedroom_fits_boiler:</span>
                                  <span className="ml-2 text-gray-800">{renderValue(product.bedroom_fits_boiler)}</span>
                                </div>
                              </div>
                              {product.acf && (
                                <div>
                                  <h4 className="font-medium text-blue-700 mb-2">ACF Fields</h4>
                                  <div className="grid grid-cols-1 gap-2">
                                    {Object.entries(product.acf).map(([acfKey, acfValue]) => (
                                      acfKey && acfValue !== undefined ? (
                                        <div key={acfKey + '-' + String(acfValue ?? '')} className="flex text-sm">
                                          <span className="w-36 font-medium text-gray-600 capitalize">{acfKey.replace(/_/g, ' ')}:</span>
                                          <span className="ml-2 text-gray-800">{renderValue(acfValue)}</span>
                                        </div>
                                      ) : null
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
              <div className="mb-4 flex gap-4 items-center">
                <button
                  type="button"
                  onClick={handleFormatAllWithAI}
                  disabled={aiFormatAllLoading || !products.length}
                  className="inline-flex items-center px-4 py-2 border border-green-600 text-green-700 bg-white rounded hover:bg-green-50 disabled:opacity-50"
                >
                  {aiFormatAllLoading ? 'Formatting All...' : 'Format All Products with AI'}
                </button>
                {aiFormatAllLoading && (
                  <div className="w-48 h-2 bg-gray-200 rounded overflow-hidden">
                    <div
                      className="h-2 bg-green-500 transition-all duration-200"
                      style={{ width: `${aiFormatAllProgress}%` }}
                    />
                  </div>
                )}
                {aiFormatAllError && <span className="text-red-600 text-sm">{aiFormatAllError}</span>}
              </div>
              {aiFormattedAll.length > 0 && (
                <div className="mb-6">
                  <div className="font-semibold mb-2 text-green-700">AI-Formatted Data Preview (All Products)</div>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">{JSON.stringify(aiFormattedAll, null, 2)}</pre>
                </div>
              )}
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
                  Review your products before importing. You can edit any product's details by clicking the "Edit" button. Changes will be saved when you click "Save" on each product.
                </p>
              </div>
              <ProductPreview 
                products={products} 
                mapping={fieldMapping}
                onProductUpdate={handleProductUpdate}
              />
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