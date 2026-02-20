'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface Brand {
  brand_id: string;
  brand_name: string;
  brand_image_url: string | null;
}

interface Model {
  model_id: string;
  brand_id: string;
  model_name: string;
}

interface EVTypeSelectionProps {
  questionId: string;
  value: any;
  onValueChange: (questionId: string, value: any) => void;
  onContinue: () => void;
  companyColor?: string;
  isRequired?: boolean;
}

export default function EVTypeSelection({
  questionId,
  value,
  onValueChange,
  onContinue,
  companyColor = '#2563eb',
  isRequired = false
}: EVTypeSelectionProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const supabase = createClient();

  // Load brands and models
  useEffect(() => {
    loadBrandsAndModels();
  }, []);

  // Initialize from existing value
  useEffect(() => {
    if (value && typeof value === 'object') {
      if (value.brand_id) {
        setSelectedBrandId(value.brand_id);
      }
      if (value.model_id) {
        setSelectedModelId(value.model_id);
      }
    }
  }, [value]);

  // Load models when brand changes
  useEffect(() => {
    if (selectedBrandId) {
      loadModels(selectedBrandId);
      // Reset model selection when brand changes
      setSelectedModelId('');
      onValueChange(questionId, {
        brand_id: selectedBrandId,
        brand_name: brands.find(b => b.brand_id === selectedBrandId)?.brand_name || '',
        model_id: '',
        model_name: ''
      });
    } else {
      setModels([]);
      setSelectedModelId('');
    }
  }, [selectedBrandId]);

  const loadBrandsAndModels = async () => {
    try {
      setLoading(true);
      
      // Load brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('ev_vehicle_brand')
        .select('brand_id, brand_name, brand_image_url')
        .eq('is_active', true)
        .order('brand_name');

      if (brandsError) throw brandsError;
      setBrands(brandsData || []);

      setLoading(false);
    } catch (error: any) {
      console.error('Error loading brands:', error);
      setError('Failed to load vehicle brands. Please try again.');
      setLoading(false);
    }
  };

  const loadModels = async (brandId: string) => {
    try {
      const { data: modelsData, error: modelsError } = await supabase
        .from('ev_vehicle_model')
        .select('model_id, brand_id, model_name')
        .eq('brand_id', brandId)
        .eq('is_active', true)
        .order('model_name');

      if (modelsError) throw modelsError;
      setModels(modelsData || []);
    } catch (error: any) {
      console.error('Error loading models:', error);
      setError('Failed to load vehicle models. Please try again.');
    }
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brandId = e.target.value;
    setSelectedBrandId(brandId);
    const selectedBrand = brands.find(b => b.brand_id === brandId);
    
    if (selectedBrand) {
      onValueChange(questionId, {
        brand_id: brandId,
        brand_name: selectedBrand.brand_name,
        model_id: '',
        model_name: ''
      });
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;
    setSelectedModelId(modelId);
    const selectedModel = models.find(m => m.model_id === modelId);
    const selectedBrand = brands.find(b => b.brand_id === selectedBrandId);
    
    if (selectedModel && selectedBrand) {
      onValueChange(questionId, {
        brand_id: selectedBrandId,
        brand_name: selectedBrand.brand_name,
        model_id: modelId,
        model_name: selectedModel.model_name
      });
    }
  };

  const handleContinue = () => {
    if (isRequired && (!selectedBrandId || !selectedModelId)) {
      setError('Please select both manufacturer and model');
      return;
    }
    
    if (selectedBrandId && selectedModelId) {
      setError('');
      onContinue();
    }
  };

  const selectedBrand = brands.find(b => b.brand_id === selectedBrandId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: companyColor }} />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Car Manufacturer */}
      <div className="space-y-2">
        <label htmlFor="car-manufacturer" className="block text-sm font-medium text-gray-700">
          Car Manufacturer
        </label>
        <div className="relative">
          <select
            id="car-manufacturer"
            value={selectedBrandId}
            onChange={handleBrandChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-base appearance-none bg-white"
            style={{
              '--tw-ring-color': companyColor,
            } as React.CSSProperties}
            onFocus={(e) => {
              e.target.style.borderColor = companyColor;
              e.target.style.boxShadow = `0 0 0 2px ${companyColor}40`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          >
            <option value="">Select manufacturer</option>
            {brands.map((brand) => (
              <option key={brand.brand_id} value={brand.brand_id}>
                {brand.brand_name}
              </option>
            ))}
          </select>
          
          {/* Brand Logo */}
          {selectedBrand && selectedBrand.brand_image_url && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <img
                src={selectedBrand.brand_image_url}
                alt={selectedBrand.brand_name}
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Dropdown Arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {!selectedBrand?.brand_image_url && (
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Car Model */}
      <div className="space-y-2">
        <label htmlFor="car-model" className="block text-sm font-medium text-gray-700">
          Car Model
        </label>
        <select
          id="car-model"
          value={selectedModelId}
          onChange={handleModelChange}
          disabled={!selectedBrandId || models.length === 0}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-base appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          style={{
            '--tw-ring-color': companyColor,
          } as React.CSSProperties}
          onFocus={(e) => {
            if (!e.target.disabled) {
              e.target.style.borderColor = companyColor;
              e.target.style.boxShadow = `0 0 0 2px ${companyColor}40`;
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db';
            e.target.style.boxShadow = 'none';
          }}
        >
          <option value="">
            {!selectedBrandId
              ? 'Select manufacturer first'
              : models.length === 0
              ? 'No models available'
              : 'Select model'}
          </option>
          {models.map((model) => (
            <option key={model.model_id} value={model.model_id}>
              {model.model_name}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-sm text-center"
        >
          {error}
        </motion.p>
      )}

      {/* Continue Button */}
      <div className="pt-4">
        <motion.button
          type="button"
          onClick={handleContinue}
          disabled={!selectedBrandId || !selectedModelId}
          className="w-full px-6 py-3 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: companyColor }}
          whileHover={{ scale: selectedBrandId && selectedModelId ? 1.02 : 1 }}
          whileTap={{ scale: selectedBrandId && selectedModelId ? 0.98 : 1 }}
          transition={{ duration: 0.1 }}
        >
          CONTINUE
        </motion.button>
      </div>

      {/* Helper Text */}
      <p className="text-sm text-gray-500 text-center">
        If you haven't bought the vehicle yet or it's not on our list, select "Vehicle not listed"
      </p>
    </motion.div>
  );
}
