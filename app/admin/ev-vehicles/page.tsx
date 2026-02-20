"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

interface Brand {
  brand_id: string;
  brand_name: string;
  brand_image_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface Model {
  model_id: string;
  brand_id: string;
  model_name: string;
  is_active: boolean;
  created_at: string;
  brand?: Brand;
}

export default function EVVehiclesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'brands' | 'models'>('brands');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Brand form state
  const [brandName, setBrandName] = useState('');
  const [brandImage, setBrandImage] = useState<File | null>(null);
  const [brandImageUrl, setBrandImageUrl] = useState('');
  const [imageInputType, setImageInputType] = useState<'file' | 'url'>('file');
  const [brandImagePreview, setBrandImagePreview] = useState<string | null>(null);
  
  // Model form state
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [modelName, setModelName] = useState('');
  
  // Edit state
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editBrandImage, setEditBrandImage] = useState<File | null>(null);
  const [editBrandImageUrl, setEditBrandImageUrl] = useState('');
  const [editImageInputType, setEditImageInputType] = useState<'file' | 'url'>('file');
  const [editBrandImagePreview, setEditBrandImagePreview] = useState<string | null>(null);
  const [editModelName, setEditModelName] = useState('');
  const [editSelectedBrandId, setEditSelectedBrandId] = useState('');

  const supabase = createClient();

  // Load brands and models
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('ev_vehicle_brand')
        .select('*')
        .eq('is_active', true)
        .order('brand_name');

      if (brandsError) throw brandsError;
      setBrands(brandsData || []);

      // Load models
      const { data: modelsData, error: modelsError } = await supabase
        .from('ev_vehicle_model')
        .select('*')
        .eq('is_active', true)
        .order('model_name');

      if (modelsError) throw modelsError;
      
      // Manually join brand data with models
      const modelsWithBrands = (modelsData || []).map((model: any) => {
        const brand = brandsData?.find((b: Brand) => b.brand_id === model.brand_id);
        return {
          ...model,
          brand: brand ? {
            brand_id: brand.brand_id,
            brand_name: brand.brand_name,
            brand_image_url: brand.brand_image_url
          } : null
        };
      });
      
      setModels(modelsWithBrands);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load vehicle data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBrandImage(file);
      setBrandImageUrl(''); // Clear URL when file is selected
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setBrandImageUrl(url);
    setBrandImage(null); // Clear file when URL is entered
    if (url.trim()) {
      setBrandImagePreview(url);
    } else {
      setBrandImagePreview(null);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditBrandImage(file);
      setEditBrandImageUrl(''); // Clear URL when file is selected
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditBrandImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setEditBrandImageUrl(url);
    setEditBrandImage(null); // Clear file when URL is entered
    if (url.trim()) {
      setEditBrandImagePreview(url);
    } else {
      setEditBrandImagePreview(null);
    }
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setEditBrandName(brand.brand_name);
    setEditBrandImageUrl(brand.brand_image_url || '');
    setEditBrandImage(null);
    setEditImageInputType(brand.brand_image_url ? 'url' : 'file');
    setEditBrandImagePreview(brand.brand_image_url || null);
  };

  const handleCancelEditBrand = () => {
    setEditingBrand(null);
    setEditBrandName('');
    setEditBrandImageUrl('');
    setEditBrandImage(null);
    setEditBrandImagePreview(null);
    setEditImageInputType('file');
  };

  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand || !editBrandName.trim()) {
      toast.error('Brand name is required');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = editingBrand.brand_image_url; // Keep existing if no change
      
      if (editImageInputType === 'file' && editBrandImage) {
        // Upload new file
        imageUrl = await uploadBrandImage(editBrandImage);
        if (!imageUrl) {
          toast.error('Failed to upload brand image');
          setSaving(false);
          return;
        }
      } else if (editImageInputType === 'url' && editBrandImageUrl.trim()) {
        // Use new URL
        imageUrl = editBrandImageUrl.trim();
      }

      const { error } = await supabase
        .from('ev_vehicle_brand')
        .update({
          brand_name: editBrandName.trim(),
          brand_image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('brand_id', editingBrand.brand_id);

      if (error) throw error;

      toast.success('Brand updated successfully');
      handleCancelEditBrand();
      loadData();
    } catch (error: any) {
      console.error('Error updating brand:', error);
      if (error.code === '23505') {
        toast.error('Brand name already exists');
      } else {
        toast.error('Failed to update brand');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditModel = (model: Model) => {
    setEditingModel(model);
    setEditModelName(model.model_name);
    setEditSelectedBrandId(model.brand_id);
  };

  const handleCancelEditModel = () => {
    setEditingModel(null);
    setEditModelName('');
    setEditSelectedBrandId('');
  };

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel || !editModelName.trim() || !editSelectedBrandId) {
      toast.error('Model name and brand are required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ev_vehicle_model')
        .update({
          model_name: editModelName.trim(),
          brand_id: editSelectedBrandId,
          updated_at: new Date().toISOString()
        })
        .eq('model_id', editingModel.model_id);

      if (error) throw error;

      toast.success('Model updated successfully');
      handleCancelEditModel();
      loadData();
    } catch (error: any) {
      console.error('Error updating model:', error);
      if (error.code === '23505') {
        toast.error('Model name already exists for this brand');
      } else {
        toast.error('Failed to update model');
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadBrandImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `ev-brands/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      toast.error('Brand name is required');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = null;
      
      if (imageInputType === 'file' && brandImage) {
        // Upload file
        imageUrl = await uploadBrandImage(brandImage);
        if (!imageUrl) {
          toast.error('Failed to upload brand image');
          setSaving(false);
          return;
        }
      } else if (imageInputType === 'url' && brandImageUrl.trim()) {
        // Use URL directly
        imageUrl = brandImageUrl.trim();
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ev_vehicle_brand')
        .insert({
          brand_name: brandName.trim(),
          brand_image_url: imageUrl,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Brand added successfully');
      setBrandName('');
      setBrandImage(null);
      setBrandImageUrl('');
      setBrandImagePreview(null);
      setImageInputType('file');
      loadData();
    } catch (error: any) {
      console.error('Error adding brand:', error);
      if (error.code === '23505') {
        toast.error('Brand name already exists');
      } else {
        toast.error('Failed to add brand');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrandId) {
      toast.error('Please select a brand');
      return;
    }
    if (!modelName.trim()) {
      toast.error('Model name is required');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ev_vehicle_model')
        .insert({
          brand_id: selectedBrandId,
          model_name: modelName.trim(),
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Model added successfully');
      setModelName('');
      setSelectedBrandId('');
      loadData();
    } catch (error: any) {
      console.error('Error adding model:', error);
      if (error.code === '23505') {
        toast.error('Model name already exists for this brand');
      } else {
        toast.error('Failed to add model');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">EV Vehicle Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage vehicle brands and models for EV Chargers</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('brands')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'brands'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Brands
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'models'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Models
          </button>
        </nav>
      </div>

      {/* Brands Tab */}
      {activeTab === 'brands' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Add/Edit Brand Form */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingBrand ? 'Edit Brand' : 'Add New Brand'}
            </h2>
            {editingBrand ? (
              <form onSubmit={handleUpdateBrand} className="space-y-4">
                <div>
                  <label htmlFor="edit-brand-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    id="edit-brand-name"
                    value={editBrandName}
                    onChange={(e) => setEditBrandName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., Tesla, Nissan, BMW"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Image
                  </label>
                  
                  {/* Toggle between File and URL */}
                  <div className="flex space-x-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditImageInputType('file');
                        setEditBrandImageUrl('');
                        setEditBrandImagePreview(null);
                      }}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                        editImageInputType === 'file'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditImageInputType('url');
                        setEditBrandImage(null);
                        setEditBrandImagePreview(null);
                      }}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                        editImageInputType === 'url'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>

                  {/* File Upload Input */}
                  {editImageInputType === 'file' && (
                    <input
                      type="file"
                      id="edit-brand-image"
                      accept="image/*"
                      onChange={handleEditImageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  )}

                  {/* URL Input */}
                  {editImageInputType === 'url' && (
                    <input
                      type="url"
                      id="edit-brand-image-url"
                      value={editBrandImageUrl}
                      onChange={handleEditImageUrlChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="https://example.com/image.png"
                    />
                  )}

                  {/* Preview */}
                  {editBrandImagePreview && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">Preview:</p>
                      <div className="relative inline-block">
                        <img
                          src={editBrandImagePreview}
                          alt="Brand preview"
                          className="h-32 w-32 object-contain border border-gray-200 rounded-lg bg-gray-50"
                          onError={() => {
                            setEditBrandImagePreview(null);
                            toast.error('Failed to load image preview. Please check the URL.');
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Updating...' : 'Update Brand'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditBrand}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddBrand} className="space-y-4">
              <div>
                <label htmlFor="brand-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name *
                </label>
                <input
                  type="text"
                  id="brand-name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Tesla, Nissan, BMW"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Image
                </label>
                
                {/* Toggle between File and URL */}
                <div className="flex space-x-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setImageInputType('file');
                      setBrandImageUrl('');
                      setBrandImagePreview(null);
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                      imageInputType === 'file'
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageInputType('url');
                      setBrandImage(null);
                      setBrandImagePreview(null);
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                      imageInputType === 'url'
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    Image URL
                  </button>
                </div>

                {/* File Upload Input */}
                {imageInputType === 'file' && (
                  <input
                    type="file"
                    id="brand-image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                )}

                {/* URL Input */}
                {imageInputType === 'url' && (
                  <input
                    type="url"
                    id="brand-image-url"
                    value={brandImageUrl}
                    onChange={handleImageUrlChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="https://example.com/image.png"
                  />
                )}

                {/* Preview */}
                {brandImagePreview && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Preview:</p>
                    <div className="relative inline-block">
                      <img
                        src={brandImagePreview}
                        alt="Brand preview"
                        className="h-32 w-32 object-contain border border-gray-200 rounded-lg bg-gray-50"
                        onError={() => {
                          setBrandImagePreview(null);
                          toast.error('Failed to load image preview. Please check the URL.');
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Brand'}
              </button>
            </form>
            )}
          </div>

          {/* Brands List */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Brands ({brands.length})</h2>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              {brands.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No brands added yet</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Brand Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {brands.map((brand) => (
                      <tr key={brand.brand_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {brand.brand_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {brand.brand_image_url ? (
                            <img
                              src={brand.brand_image_url}
                              alt={brand.brand_name}
                              className="h-10 w-10 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-sm text-gray-400">No image</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditBrand(brand)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Add/Edit Model Form */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingModel ? 'Edit Model' : 'Add New Model'}
            </h2>
            {editingModel ? (
              <form onSubmit={handleUpdateModel} className="space-y-4">
                <div>
                  <label htmlFor="edit-model-brand" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Brand *
                  </label>
                  <select
                    id="edit-model-brand"
                    value={editSelectedBrandId}
                    onChange={(e) => setEditSelectedBrandId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">Choose a brand...</option>
                    {brands.map((brand) => (
                      <option key={brand.brand_id} value={brand.brand_id}>
                        {brand.brand_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-model-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    id="edit-model-name"
                    value={editModelName}
                    onChange={(e) => setEditModelName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., Model 3, Leaf, i3"
                    required
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={saving || brands.length === 0}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Updating...' : 'Update Model'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditModel}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
                {brands.length === 0 && (
                  <p className="text-xs text-gray-500 text-center">Please add a brand first</p>
                )}
              </form>
            ) : (
              <form onSubmit={handleAddModel} className="space-y-4">
              <div>
                <label htmlFor="model-brand" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Brand *
                </label>
                <select
                  id="model-brand"
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Choose a brand...</option>
                  {brands.map((brand) => (
                    <option key={brand.brand_id} value={brand.brand_id}>
                      {brand.brand_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="model-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Model Name *
                </label>
                <input
                  type="text"
                  id="model-name"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Model 3, Leaf, i3"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving || brands.length === 0}
                className="w-full px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Model'}
              </button>
              {brands.length === 0 && (
                <p className="text-xs text-gray-500 text-center">Please add a brand first</p>
              )}
            </form>
            )}
          </div>

          {/* Models List */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Models ({models.length})</h2>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              {models.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No models added yet</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Brand
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {models.map((model) => (
                      <tr key={model.model_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {model.brand?.brand_image_url ? (
                            <img
                              src={model.brand.brand_image_url}
                              alt={model.brand.brand_name}
                              className="h-10 w-10 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-sm text-gray-400">No image</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {model.brand?.brand_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {model.model_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditModel(model)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
