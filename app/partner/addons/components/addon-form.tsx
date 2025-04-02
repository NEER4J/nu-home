"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";
import { ServiceCategory } from "@/types";

interface AddonType {
  id: string;
  name: string;
  allow_multiple_selection?: boolean;
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.string().min(1, "Price is required").transform((val) => parseFloat(val)),
  addon_type_id: z.string().min(1, "Addon type is required"),
  image_link: z.string().optional(),
  service_category_id: z.string().min(1, "Service category is required"),
  partner_id: z.string().optional(),
  allow_multiple: z.boolean().default(false),
  max_count: z.number().nullable().optional(),
});

interface AddonFormProps {
  initialData?: any;
  onSuccess: () => void;
}

export default function AddonForm({ initialData, onSuccess }: AddonFormProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [addonTypes, setAddonTypes] = useState<AddonType[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const supabase = createClient();

  console.log("AddonForm received initialData:", initialData);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      price: initialData?.price?.toString() || "",
      addon_type_id: initialData?.addon_type_id || "",
      image_link: initialData?.image_link || "",
      service_category_id: initialData?.service_category_id || "",
      allow_multiple: initialData?.allow_multiple || false,
      max_count: initialData?.max_count || null,
    },
  });

  // Get current selected category id and allow_multiple value
  const selectedCategoryId = watch("service_category_id");
  const allowMultiple = watch("allow_multiple");

  // Initialize form with initial data
  useEffect(() => {
    const initializeForm = async () => {
      if (initialData) {
        console.log("Initializing form with data:", initialData);
        
        // First fetch categories
        await fetchCategories();
        
        // Then set form values
        setValue("title", initialData.title || "");
        setValue("description", initialData.description || "");
        setValue("price", initialData.price?.toString() || "");
        setValue("image_link", initialData.image_link || "");
        setValue("allow_multiple", initialData.allow_multiple || false);
        setValue("max_count", initialData.max_count || null);
        
        // Set service category last, as it will trigger addon types fetch
        if (initialData.service_category_id) {
          setValue("service_category_id", initialData.service_category_id);
          
          // Fetch addon types for this category
          await fetchAddonTypes(initialData.service_category_id);
          
          // Set addon type after types are loaded
          if (initialData.addon_type_id) {
            setValue("addon_type_id", initialData.addon_type_id);
          }
        }
        
        setIsInitialized(true);
      } else {
        // For new addons, just fetch categories
        await fetchCategories();
        setIsInitialized(true);
      }
    };
    
    initializeForm();
  }, [initialData, setValue]);

  // Fetch addon types when category changes (only after initialization)
  useEffect(() => {
    if (isInitialized && selectedCategoryId) {
      fetchAddonTypes(selectedCategoryId);
    }
  }, [selectedCategoryId, isInitialized]);

  // Get the current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Error fetching user:", error);
          return;
        }

        if (data?.user) {
          console.log("Current user:", data.user);
          setUser(data.user);
          setValue('partner_id', data.user.id);
        }
      } catch (error) {
        console.error("Exception fetching user:", error);
      }
    };

    fetchUser();
  }, [setValue]);

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
      console.log("Fetching addon types for category:", categoryId);
      
      const { data, error } = await supabase
        .from("ServiceCategories")
        .select("addon_types")
        .eq("service_category_id", categoryId)
        .single();

      if (error) throw error;

      let typesArray: AddonType[] = [];
      if (data.addon_types && Array.isArray(data.addon_types)) {
        typesArray = data.addon_types.map((type: any) => ({
          id: type.id || type.name, // Use name as fallback id
          name: type.name || type, // Support both object and string formats
          allow_multiple_selection: type.allow_multiple_selection || false
        }));
      }

      console.log("Fetched addon types:", typesArray);
      setAddonTypes(typesArray);

      // Reset addon_type_id field if current value is not in new types list
      const currentTypeId = getValues("addon_type_id");
      if (currentTypeId && !typesArray.some(type => type.id === currentTypeId)) {
        setValue("addon_type_id", "");
      }
    } catch (error) {
      console.error("Error fetching addon types:", error);
    }
  };

  // Get the selected addon type
  const selectedAddonType = addonTypes.find(type => type.id === watch("addon_type_id"));

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    try {
      // Get the current user just to be sure we have the latest
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user) {
        throw new Error("Failed to authenticate. Please refresh and try again.");
      }
      
      // Ensure partner_id is set to the current user
      values.partner_id = data.user.id;
      console.log("Submitting with values:", values);
      
      if (initialData) {
        const { error } = await supabase
          .from("Addons")
          .update(values)
          .eq("addon_id", initialData.addon_id)
          .eq("partner_id", data.user.id); // Ensure we only update our own addons

        if (error) {
          console.error("Error updating addon:", error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("Addons")
          .insert({ ...values, partner_id: data.user.id });

        if (error) {
          console.error("Error inserting addon:", error);
          throw error;
        }
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving addon:", error);
      alert("Failed to save addon: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          placeholder="Enter addon title"
          {...register("title")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          placeholder="Enter addon description"
          {...register("description")}
          rows={4}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
          Price
        </label>
        <input
          id="price"
          type="number"
          step="0.01"
          placeholder="Enter price"
          {...register("price")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.price && (
          <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="image_link" className="block text-sm font-medium text-gray-700">
          Image URL
        </label>
        <input
          id="image_link"
          type="text"
          placeholder="Enter image URL"
          {...register("image_link")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.image_link && (
          <p className="mt-1 text-sm text-red-600">{errors.image_link.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="service_category_id" className="block text-sm font-medium text-gray-700">
          Service Category
        </label>
        <select
          id="service_category_id"
          {...register("service_category_id")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option 
              key={category.service_category_id} 
              value={category.service_category_id}
            >
              {category.name}
            </option>
          ))}
        </select>
        {errors.service_category_id && (
          <p className="mt-1 text-sm text-red-600">{errors.service_category_id.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="addon_type_id" className="block text-sm font-medium text-gray-700">
          Addon Type
        </label>
        <select
          id="addon_type_id"
          {...register("addon_type_id")}
          disabled={addonTypes.length === 0}
          className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
            addonTypes.length === 0 ? "bg-gray-100 cursor-not-allowed" : ""
          }`}
        >
          <option value="">
            {addonTypes.length === 0 ? "Select a category first" : "Select an addon type"}
          </option>
          {addonTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        {errors.addon_type_id && (
          <p className="mt-1 text-sm text-red-600">{errors.addon_type_id.message}</p>
        )}
        {addonTypes.length === 0 && selectedCategoryId && (
          <p className="mt-1 text-sm text-amber-600">
            No addon types found for this category. Please add addon types in the category settings.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="allow_multiple"
            {...register("allow_multiple")}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label 
            htmlFor="allow_multiple" 
            className="text-sm font-medium text-gray-700"
          >
            Allow multiple quantities of this addon
          </label>
        </div>
        
        {allowMultiple && (
          <div>
            <label htmlFor="max_count" className="block text-sm font-medium text-gray-700">
              Maximum quantity (optional)
            </label>
            <input
              id="max_count"
              type="number"
              min="1"
              placeholder="Leave empty for unlimited"
              {...register("max_count", { 
                setValueAs: (v) => v === "" ? null : parseInt(v, 10),
                min: 1
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.max_count && (
              <p className="mt-1 text-sm text-red-600">{errors.max_count.message}</p>
            )}
          </div>
        )}
        
        <div className="mt-2 text-sm text-gray-500">
          <p>
            <strong>Note:</strong> This setting controls whether customers can add multiple quantities of this specific addon.
            {selectedAddonType && (
              <span className="ml-1">
                The addon type "{selectedAddonType.name}" {selectedAddonType.allow_multiple_selection ? "allows" : "does not allow"} multiple different addons to be selected.
              </span>
            )}
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Saving..." : initialData ? "Update Addon" : "Create Addon"}
      </button>
    </form>
  );
} 