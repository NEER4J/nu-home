'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface MatchDetail {
  type: string;
  userAnswer: string;
  productValue: string;
  matches: boolean;
}

interface Product {
  partner_product_id: string
  name: string
  description: string
  price: number
  image_url: string
  slug: string
  product_fields: Record<string, any>
  specifications: Record<string, string>
  matchDetails: MatchDetail[]
}

interface CustomerDetails {
  first_name: string
  last_name: string
  email: string
  phone: string
  city: string
  postcode: string
  form_answers: Array<{
    answer: string
    question_id: string
    question_text: string
  }>
}

export default function HeatingProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null)
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    'Boiler Type': [],
    'Fuel Type': [],
    'Property Size': [],
    'Energy Efficiency': []
  })

  // Predefined filter options
  const predefinedOptions = {
    'Boiler Type': [
      { text: 'Combi Boiler' },
      { text: 'Regular Boiler' },
      { text: 'System Boiler' },
      { text: 'Back Boiler' }
    ],
    'Property Size': [
      { text: 'One' },
      { text: 'Two' },
      { text: 'Three' },
      { text: 'Four' },
      { text: 'Five' }
    ],
    'Fuel Type': [
      { text: 'Mains Gas' },
      { text: 'LPG' },
      { text: 'Oil' }
    ]
  };

  // Initial data fetch
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams(window.location.search);
      const submissionId = searchParams.get('submission');

      if (!submissionId) {
        setError('No submission ID provided');
        return;
      }

      const response = await fetch(`/api/products?submission_id=${submissionId}&category=heating`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch products');
        return;
      }

      setAllProducts(data.products);
      setProducts(data.products);
      setCustomerDetails(data.customerDetails);

      // Auto-select filters based on customer requirements
      if (data.customerDetails?.form_answers) {
        const initialFilters: Record<string, string[]> = {
          'Boiler Type': [],
          'Fuel Type': [],
          'Property Size': [],
          'Energy Efficiency': []
        };

        data.customerDetails.form_answers.forEach((answer: { 
          answer: string;
          question_text: string;
          question_id: string;
        }) => {
          const questionLower = answer.question_text.toLowerCase();
          const answerLower = answer.answer.toLowerCase();

          if (questionLower.includes('type of boiler')) {
            // Don't add combi boiler if they want to keep cylinder
            if (!questionLower.includes('convert to a combi') || 
                !answerLower.includes('keep')) {
              initialFilters['Boiler Type'].push(answer.answer);
            }
          } else if (questionLower.includes('fuel')) {
            initialFilters['Fuel Type'].push(answer.answer);
          } else if (questionLower.includes('bedroom')) {
            initialFilters['Property Size'].push(answer.answer);
          } else if (questionLower.includes('energy efficiency') && 
                     answerLower.includes('very important')) {
            initialFilters['Energy Efficiency'].push('High (A or B rated)');
          }
        });

        setSelectedFilters(initialFilters);
      }
    } catch (err) {
      setError('An error occurred while fetching products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Filter products based on selected filters
  const filterProducts = useCallback((filters: Record<string, string[]>) => {
    if (!allProducts.length) return;

    const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);
    if (!hasActiveFilters) {
      setProducts(allProducts);
      return;
    }

    const filtered = allProducts.filter(product => {
      return Object.entries(filters).every(([filterType, selectedValues]) => {
        if (selectedValues.length === 0) return true;

        return product.matchDetails?.some(detail => {
          // Case-insensitive comparison
          const productValue = detail.productValue.toLowerCase();
          return detail.type === filterType && 
                 selectedValues.some(value => productValue.includes(value.toLowerCase()));
        });
      });
    });

    setProducts(filtered);
  }, [allProducts]);

  // Handle filter changes
  const toggleFilterOption = useCallback((filterType: string, value: string) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      if (newFilters[filterType].includes(value)) {
        newFilters[filterType] = newFilters[filterType].filter(v => v !== value);
      } else {
        newFilters[filterType] = [...newFilters[filterType], value];
      }
      return newFilters;
    });
  }, []);

  // Apply filters when selection changes
  useEffect(() => {
    filterProducts(selectedFilters);
  }, [selectedFilters, filterProducts]);

  // Get all available options for each filter type
  const getFilterOptions = () => {
    if (!allProducts.length) return {};

    const options: Record<string, Set<string>> = {
      'Boiler Type': new Set(),
      'Fuel Type': new Set(),
      'Property Size': new Set(),
      'Energy Efficiency': new Set()
    };

    allProducts.forEach(product => {
      product.matchDetails?.forEach(detail => {
        if (options[detail.type]) {
          options[detail.type].add(detail.productValue);
        }
      });
    });

    return Object.fromEntries(
      Object.entries(options).map(([key, value]) => [key, Array.from(value).sort()])
    );
  };

  // Get the applied filters from form answers
  const getAppliedFilters = () => {
    if (!customerDetails) return [];

    return customerDetails.form_answers
      .filter(answer => {
        const questionLower = answer.question_text.toLowerCase();
        return (
          questionLower.includes('type of boiler') ||
          questionLower.includes('fuel') ||
          questionLower.includes('bedrooms') ||
          questionLower.includes('budget') ||
          questionLower.includes('energy efficiency')
        );
      })
      .map(answer => {
        const questionLower = answer.question_text.toLowerCase();
        let filterType = '';
        let filterValue = answer.answer;

        if (questionLower.includes('type of boiler')) {
          filterType = 'Boiler Type';
        } else if (questionLower.includes('fuel')) {
          filterType = 'Fuel Type';
        } else if (questionLower.includes('bedrooms')) {
          filterType = 'Property Size';
        } else if (questionLower.includes('budget')) {
          filterType = 'Budget';
        } else if (questionLower.includes('energy efficiency')) {
          filterType = 'Energy Efficiency';
          filterValue = answer.answer.includes('very important') ? 'High (A or B rated)' : 'Not specified';
        }

        return { type: filterType, value: filterValue };
      });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Loading...</h1>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Error</h1>
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  const filterOptions = getFilterOptions();
  const appliedFilters = getAppliedFilters();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with filter button and selected filters */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Our Heating Solutions</h1>
          <p className="text-gray-600 mt-2">
            We've found {products.length} boilers suitable for your home
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Selected Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(selectedFilters).map(([type, values]) =>
              values.map(value => (
                <div
                  key={`${type}-${value}`}
                  className="flex items-center bg-primary/5 text-primary px-3 py-1 rounded-full text-sm"
                >
                  <span className="mr-1">{value}</span>
                  <button
                    onClick={() => toggleFilterOption(type, value)}
                    className="ml-1 hover:text-primary/70"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow hover:shadow-md transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <span>Filter</span>
            {Object.values(selectedFilters).flat().length > 0 && (
              <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {Object.values(selectedFilters).flat().length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Slide-out Panel */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${showFilters ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Filter Header */}
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Filter Products</h2>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* Filter Options */}
            <div className="space-y-4">
              {Object.entries(predefinedOptions).map(([filterType, options]) => (
                <div key={filterType} className="space-y-2">
                  <h4 className="font-medium text-gray-700 text-sm">{filterType}</h4>
                  <div className="space-y-1">
                    {options.map((option) => (
                      <label 
                        key={option.text} 
                        className={`flex items-center p-1.5 rounded cursor-pointer transition-all text-sm
                          ${selectedFilters[filterType].includes(option.text) 
                            ? 'bg-primary/5 text-primary' 
                            : 'hover:bg-gray-50'}`}
                      >
                        <input
                          type="checkbox"
                          className="form-checkbox h-3.5 w-3.5 text-primary rounded mr-2"
                          checked={selectedFilters[filterType].includes(option.text)}
                          onChange={() => toggleFilterOption(filterType, option.text)}
                        />
                        <span className="font-medium">{option.text}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {allProducts.filter(p => 
                            p.matchDetails?.some(m => 
                              m.type === filterType && m.productValue === option.text
                            )
                          ).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Original Requirements Section */}
            {appliedFilters.length > 0 && (
              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-700 mb-2 text-sm">Your Original Requirements</h4>
                <div className="space-y-1">
                  {appliedFilters.map((filter, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-blue-600">{filter.type}</span>
                      <span className="text-blue-800 font-medium">{filter.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Actions */}
          <div className="p-3 border-t space-y-2">
            {Object.values(selectedFilters).some(arr => arr.length > 0) && (
              <div className="p-2 bg-yellow-50 rounded text-xs">
                <p className="text-yellow-800">
                  You are viewing products that may not match your original requirements.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSelectedFilters({
                    'Boiler Type': [],
                    'Fuel Type': [],
                    'Property Size': [],
                    'Energy Efficiency': []
                  });
                }}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => {
                  fetchInitialData();
                }}
                className="px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary/90 transition-colors"
              >
                Reset to Original
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when filter panel is open */}
      {showFilters && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setShowFilters(false)}
        />
      )}

        {/* Products Grid */}
      <div className="space-y-6">
        {products.map((product) => (
              <div 
                key={product.partner_product_id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
            <div className="flex">
              {/* Left: Image Section */}
              <div className="w-1/4 p-6 flex flex-col items-center">
                {product.image_url && (
                  <div className="relative w-full aspect-square mb-4">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <div className="bg-green-600 text-white px-4 py-2 rounded-full text-center">
                  <span className="block text-2xl font-bold">1</span>
                  <span className="text-sm">Year</span>
                  <span className="block text-sm">Warranty</span>
                </div>
              </div>

              {/* Middle: Product Details */}
              <div className="w-1/2 p-6 border-l border-r border-gray-100">
                <h2 className="text-2xl font-bold mb-4">{product.name}</h2>

                {/* Key Specifications */}
                <div className="space-y-4">
                  {/* Power Output */}
                  {product.product_fields?.output_rating && (
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100">
                        <span className="text-blue-600 text-lg">⚡</span>
                      </div>
                      <span className="font-medium">
                        Boiler power: {product.product_fields.output_rating} kW
                      </span>
                  </div>
                )}
                
                  {/* Flow Rate */}
                  {product.product_fields?.flow_rate && (
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100">
                        <span className="text-blue-600 text-lg">💧</span>
                      </div>
                      <span className="font-medium">
                        Flow Rate: {product.product_fields.flow_rate}
                      </span>
                    </div>
                  )}
                  
                  {/* Specifications */}
                  {product.specifications && Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100">
                        <span className="text-blue-600 text-lg">📊</span>
                      </div>
                      <span className="font-medium">
                        {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}: {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Features List */}
                <div className="mt-6 space-y-2">
                  {product.product_fields?.features?.map((feature: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span className="text-gray-600">{feature}</span>
                    </div>
                  ))} 
                  {/* Default features if none provided */}
                  {(!product.product_fields?.features || product.product_fields.features.length === 0) && [
                    'Stainless steel heat exchanger, lightweight and heats water effectively.',
                    'Internal pressure gauge.',
                    'Combined PVR & drain.',
                    'Optional stand-off frame.',
                    'Compatible with Open Therm.'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span className="text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Price and Actions */}
              <div className="w-1/4 p-6 bg-gray-50">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-600">Your fixed installation price</h3>
                  {product.price && (
                      <>
                        <div className="flex items-baseline space-x-2 mb-1">
                          <span className="text-3xl font-bold">£{product.price.toLocaleString()}</span>
                          {product.product_fields?.original_price && (
                            <span className="text-sm text-gray-500 line-through">
                              £{product.product_fields.original_price}
                            </span>
                          )}
                        </div>
                        {product.product_fields?.monthly_payment && (
                          <p className="text-sm text-gray-600">
                            or from £{product.product_fields.monthly_payment} / mo
                            {product.product_fields?.apr && (
                              <span className="text-blue-500"> {product.product_fields.apr}% APR</span>
                            )}
                    </p>
                  )}
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                  <Link
                    href={`/category/heating/products/${product.slug}`}
                      className="block w-full bg-green-600 text-white text-center px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
                  >
                      Secure my fixed price
                  </Link>
                    <button
                      className="block w-full border border-gray-300 text-gray-700 text-center px-6 py-3 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Get a remote survey
                    </button>
                    <button
                      className="block w-full text-blue-500 text-center px-6 py-2 hover:underline"
                    >
                      Save this boiler
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Specs (if needed) */}
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
              {/* Matching Details */}
              {product.matchDetails && product.matchDetails.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-3">Matching with your requirements:</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {product.matchDetails.map((detail, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded ${detail.matches ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-grow">
                            <div className="flex items-center">
                              <span className={`mr-2 ${detail.matches ? 'text-green-500' : 'text-red-500'}`}>
                                {detail.matches ? '✓' : '✗'}
                              </span>
                              <p className="font-medium text-gray-900">{detail.type}</p>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Your requirement:</p>
                                <p className="text-sm text-gray-900">{detail.userAnswer}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Product specification:</p>
                                <p className="text-sm text-gray-900">{detail.productValue}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Fields */}
              <div className="grid grid-cols-4 gap-4">
                {/* Product Fields */}
                {Object.entries(product.product_fields || {}).map(([key, value]) => {
                  // Skip if value is empty or if it's already shown above
                  if (!value || 
                      (Array.isArray(value) && value.length === 0) ||
                      ['output_rating', 'flow_rate', 'features', 'original_price', 'monthly_payment', 'apr'].includes(key)) {
                    return null;
                  }

                  // Format the key for display
                  const displayKey = key
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                  // Format the value for display
                  let displayValue = Array.isArray(value) 
                    ? value.join(', ')
                    : String(value);

                  // Add units where appropriate
                  if (key === 'output_rating') {
                    displayValue += ' kW';
                  } else if (key === 'suitable_for_bedrooms') {
                    displayValue += ' bedrooms';
                  } else if (key === 'warranty') {
                    displayValue += ' years';
                  }

                  return (
                    <div key={key} className="text-sm">
                      <p className="font-medium text-gray-500">{displayKey}</p>
                      <p className="font-medium">{displayValue}</p>
                    </div>
                  );
                })}

                {/* Specifications */}
                {Object.entries(product.specifications || {}).map(([key, value]) => {
                  const displayKey = key
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                  return (
                    <div key={`spec-${key}`} className="text-sm">
                      <p className="font-medium text-gray-500">{displayKey}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  );
                })}
              </div>
                </div>
              </div>
            ))}

        {products.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No products match your requirements.</p>
          </div>
        )}
      </div>

      {/* Customer Details Dropdown */}
      {customerDetails && (
        <div className="bg-white rounded-lg shadow-md mt-8">
          <button
            onClick={() => setShowCustomerDetails(!showCustomerDetails)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {customerDetails.first_name[0]}{customerDetails.last_name[0]}
                </span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold">{customerDetails.first_name} {customerDetails.last_name}</h3>
                <p className="text-sm text-gray-500">{customerDetails.city}, {customerDetails.postcode}</p>
              </div>
            </div>
            {showCustomerDetails ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {showCustomerDetails && (
            <div className="p-4 border-t">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{customerDetails.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{customerDetails.phone}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-500">Your Requirements</h4>
                <div className="grid grid-cols-2 gap-2">
                  {customerDetails.form_answers.map((answer, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded">
                      <p className="text-sm font-medium">{answer.question_text}</p>
                      <p className="text-sm text-gray-600">{answer.answer}</p>
                    </div>
                  ))}
          </div>
        </div>
      </div>
          )}
        </div>
      )}
    </div>
  )
} 