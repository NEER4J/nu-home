"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Addon, ServiceCategory } from "@/types";
import Image from "next/image";

interface AddonFormProps {
  initialData?: Addon | null;
  onSuccess?: () => void;
}

export default function AddonForm({ initialData, onSuccess }: AddonFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [addonTypes, setAddonTypes] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    price: initialData?.price || 0,
    image_link: initialData?.image_link || "",
    service_category_id: initialData?.service_category_id || "",
    addon_type_id: initialData?.addon_type_id || "",
    allow_multiple: initialData?.allow_multiple || false,
    max_count: initialData?.max_count || null,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (formData.service_category_id) {
      fetchAddonTypes(formData.service_category_id);
    } else {
      setAddonTypes([]);
    }
  }, [formData.service_category_id]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("ServiceCategories")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchAddonTypes = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from("ServiceCategories")
        .select("addon_types")
        .eq("service_category_id", categoryId)
        .single();

      if (error) throw error;
      
      if (data?.addon_types) {
        setAddonTypes(data.addon_types);
      } else {
        setAddonTypes([]);
      }
    } catch (error) {
      console.error("Error fetching addon types:", error);
      setAddonTypes([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const addonData = {
        ...formData,
        partner_id: user.id,
        max_count: formData.allow_multiple ? formData.max_count : null,
      };

      if (initialData) {
        // Update existing addon
        const { error } = await supabase
          .from("Addons")
          .update(addonData)
          .eq("addon_id", initialData.addon_id);

        if (error) throw error;
      } else {
        // Create new addon
        const { error } = await supabase
          .from("Addons")
          .insert([addonData]);

        if (error) throw error;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/partner/addons");
      }
    } catch (error) {
      console.error("Error saving addon:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter addon title"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter addon description"
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price (£)
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500">£</span>
              </div>
              <input
                type="number"
                id="price"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 pl-7 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="service_category_id" className="block text-sm font-medium text-gray-700 mb-1">
                Service Category
              </label>
              <select
                id="service_category_id"
                required
                value={formData.service_category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, service_category_id: e.target.value, addon_type_id: "" }))}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.service_category_id} value={category.service_category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="addon_type_id" className="block text-sm font-medium text-gray-700 mb-1">
                Addon Type
              </label>
              <select
                id="addon_type_id"
                required
                value={formData.addon_type_id}
                onChange={(e) => setFormData(prev => ({ ...prev, addon_type_id: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!formData.service_category_id}
              >
                <option value="">Select an addon type</option>
                {addonTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allow_multiple"
                checked={formData.allow_multiple}
                onChange={(e) => setFormData(prev => ({ ...prev, allow_multiple: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="allow_multiple" className="ml-2 block text-sm text-gray-700">
                Allow Multiple Selections
              </label>
            </div>

            {formData.allow_multiple && (
              <div className="mt-4">
                <label htmlFor="max_count" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Count
                </label>
                <input
                  type="number"
                  id="max_count"
                  min="1"
                  value={formData.max_count || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_count: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter maximum count"
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="image_link" className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  id="image_link"
                  value={formData.image_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_link: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter image URL"
                />
              </div>
              {formData.image_link && (
                <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={formData.image_link}
                    alt="Addon preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.push("/partner/addons")}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : initialData ? "Update Addon" : "Create Addon"}
          </button>
        </div>
      </form>
    </div>
  );
}
