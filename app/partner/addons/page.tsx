"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { Addon } from "@/types";
import { Edit2, Trash2, ExternalLink } from "lucide-react";

export default function PartnerAddonsPage() {
  const router = useRouter();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Addons");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const supabase = createClient();

  useEffect(() => {
    // Check auth and fetch addons
    const checkAuthAndFetchData = async () => {
      setLoading(true);
      try {
        // Get current user
        const { data, error } = await supabase.auth.getUser();
        
        if (error || !data.user) {
          console.log("No authenticated user found");
          router.push('/auth/signin');
          return;
        }
        
        const currentUser = data.user;
        setUser(currentUser);
        
        // Fetch addons for the current user
        await fetchAddons(currentUser.id);
      } catch (err) {
        console.error("Exception in auth check:", err);
        router.push('/auth/signin');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, [router]);

  const fetchAddons = async (partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from("Addons")
        .select(`
          *,
          ServiceCategories (
            name,
            slug
          )
        `)
        .eq("partner_id", partnerId);

      if (error) {
        console.error("Error fetching addons:", error);
        return;
      }

      console.log("Fetched addons:", data);
      setAddons(data || []);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(["All Addons", ...(data || []).map(addon => 
        addon.ServiceCategories?.name || "Uncategorized"
      )]));
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error in fetchAddons:", error);
    }
  };

  const handleDelete = async (addonId: string) => {
    try {
      const { error } = await supabase
        .from("Addons")
        .delete()
        .eq("addon_id", addonId);

      if (error) throw error;
      
      // Refresh the addons list
      if (user) {
        fetchAddons(user.id);
      }
    } catch (error) {
      console.error("Error deleting addon:", error);
    }
  };

  const filteredAddons = selectedCategory === "All Addons"
    ? addons
    : addons.filter(addon => addon.ServiceCategories?.name === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Addons</h1>
        <button 
          onClick={() => router.push("/partner/addons/new")}
          className="inline-flex justify-center py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add New Addon
        </button>
      </div>

      {/* Horizontal Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex -mb-px space-x-8 overflow-x-auto" aria-label="Tabs">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`py-4 px-1 font-medium text-sm whitespace-nowrap border-b-2 ${
                selectedCategory === category
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={selectedCategory === category ? "page" : undefined}
            >
              {category}
            </button>
          ))}
        </nav>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Addons</h2>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredAddons.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No addons found. Click "Add New Addon" to create one.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredAddons.map((addon) => (
              <li key={addon.addon_id}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    {addon.image_link ? (
                      <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md overflow-hidden">
                        <Image
                          src={addon.image_link}
                          alt={addon.title}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 truncate">
                        {addon.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {addon.ServiceCategories?.name || "Uncategorized"}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        £{addon.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 ml-4 space-x-2">
                    <button
                      onClick={() => router.push(`/partner/addons/${addon.addon_id}`)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => window.open(`/addons/${addon.addon_id}`, '_blank')}
                      className="text-blue-600 hover:text-blue-800"
                      title="View"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(addon.addon_id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 