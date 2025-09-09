'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package, ChevronDown, ChevronUp, Edit2, Save, X } from 'lucide-react';

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
  [key: string]: any; // Add index signature for dynamic access
}

interface FieldMapping {
  [key: string]: string;
}

interface ProductPreviewProps {
  products: WordPressProduct[];
  mapping: FieldMapping;
  onProductUpdate?: (productId: number, updatedData: any) => void;
}

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export function ProductPreview({ products, mapping, onProductUpdate }: ProductPreviewProps) {
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editedProducts, setEditedProducts] = useState<Record<number, WordPressProduct>>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});

  const handleEdit = (productId: number) => {
    setEditingProduct(productId);
    if (!editedProducts[productId]) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setEditedProducts(prev => ({
          ...prev,
          [productId]: { ...product }
        }));
      }
    }
  };

  const handleSave = (productId: number) => {
    if (onProductUpdate && editedProducts[productId]) {
      onProductUpdate(productId, editedProducts[productId]);
    }
    setEditingProduct(null);
  };

  const handleCancel = (productId: number) => {
    setEditingProduct(null);
    setEditedProducts(prev => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
  };

  const handleFieldChange = (productId: number, dbField: string, wpPath: string, value: any) => {
    const pathParts = wpPath.split('.');
    const fieldName = pathParts[0];
    
    setEditedProducts(prev => {
      const product = { ...prev[productId] };
      
      if (fieldName === 'acf') {
        const acfField = pathParts[1];
        product.acf = {
          ...product.acf,
          [acfField]: value
        };
      } else if (fieldName === 'title') {
        product.title = {
          ...product.title,
          rendered: value
        };
      } else {
        product[fieldName] = value;
      }
      
      return {
        ...prev,
        [productId]: product
      };
    });
  };

  const renderEditableField = (product: any, dbField: string, wpPath: string, value: any, isEditing: boolean) => {
    if (!isEditing) {
      if (Array.isArray(value)) {
        return value.map((item: any) => item.description_item || item.text).join(', ');
      }
      if (typeof value === 'object' && value !== null) {
        if (value.rendered) return value.rendered;
        return JSON.stringify(value);
      }
      return String(value || '');
    }

    const currentValue = editedProducts[product.id] 
      ? getNestedValue(editedProducts[product.id], wpPath)
      : value;

    if (Array.isArray(currentValue)) {
      return (
        <div className="space-y-2">
          {currentValue.map((item: any, index: number) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item.description_item || item.text || ''}
                onChange={(e) => {
                  const newValue = [...currentValue];
                  newValue[index] = {
                    ...item,
                    description_item: item.hasOwnProperty('description_item') ? e.target.value : undefined,
                    text: item.hasOwnProperty('text') ? e.target.value : undefined
                  };
                  handleFieldChange(product.id, dbField, wpPath, newValue);
                }}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <button
                onClick={() => {
                  const newValue = currentValue.filter((_: any, i: number) => i !== index);
                  handleFieldChange(product.id, dbField, wpPath, newValue);
                }}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const template = currentValue[0] || {};
              const newItem = Object.keys(template).reduce((acc, key) => ({
                ...acc,
                [key]: ''
              }), {});
              handleFieldChange(product.id, dbField, wpPath, [...currentValue, newItem]);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Add Item
          </button>
        </div>
      );
    }

    if (typeof currentValue === 'object' && currentValue !== null) {
      if (currentValue.rendered !== undefined) {
        return (
          <input
            type="text"
            value={currentValue.rendered}
            onChange={(e) => handleFieldChange(product.id, dbField, wpPath, { ...currentValue, rendered: e.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        );
      }

      return (
        <div className="space-y-2">
          {Object.entries(currentValue).map(([key, val]) => (
            <div key={key} className="flex gap-2">
              <span className="text-sm text-gray-500">{key}:</span>
              <input
                type="text"
                value={val as string}
                onChange={(e) => {
                  const newValue = {
                    ...currentValue,
                    [key]: e.target.value
                  };
                  handleFieldChange(product.id, dbField, wpPath, newValue);
                }}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <input
        type="text"
        value={currentValue || ''}
        onChange={(e) => handleFieldChange(product.id, dbField, wpPath, e.target.value)}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
      />
    );
  };

  const toggleDetails = (productId: number) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  return (
    <div className="space-y-6">
      {products.map((product) => {
        const isEditing = editingProduct === product.id;
        const isExpanded = expandedProducts[product.id];
        const displayProduct = editedProducts[product.id] || product;

        return (
          <div key={product.id} className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isEditing ? (
                      <input
                        type="text"
                        value={displayProduct.title.rendered}
                        onChange={(e) => handleFieldChange(product.id, 'name', 'title.rendered', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    ) : (
                      displayProduct.title.rendered
                    )}
                  </h3>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => toggleDetails(product.id)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSave(product.id)}
                        className="text-green-600 hover:text-green-800 transition-colors"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleCancel(product.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEdit(product.id)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(mapping).map(([dbField, wpPath]) => {
                    const value = getNestedValue(displayProduct, wpPath);
                    return (
                      <div key={dbField} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {dbField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <div className="mt-1">
                          {renderEditableField(product, dbField, wpPath, value, isEditing)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {displayProduct.acf?.boiler_details && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Boiler Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayProduct.acf.boiler_details.map((detail, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          {isEditing ? (
                            <input
                              type="text"
                              value={detail.text}
                              onChange={(e) => {
                                const newDetails = [...displayProduct.acf.boiler_details];
                                newDetails[index] = { ...detail, text: e.target.value };
                                handleFieldChange(product.id, 'boiler_details', 'acf.boiler_details', newDetails);
                              }}
                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">{detail.text}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 