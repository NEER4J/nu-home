"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

interface Addon {
  addon_id: string;
  title: string;
  description: string;
  price: number;
  image_link?: string;
  addon_type: boolean;
  ServiceCategories: {
    name: string;
    slug: string;
  };
}

interface ServiceCategory {
  service_category_id: string;
  name: string;
  slug: string;
}

export default function AddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    fetchAddons();
    fetchCategories();
  }, []);

  const fetchAddons = async () => {
    try {
      const { data, error } = await supabase
        .from("Addons")
        .select(`
          *,
          ServiceCategories (
            name,
            slug
          )
        `);

      if (error) throw error;
      setAddons(data || []);
    } catch (error) {
      console.error("Error fetching addons:", error);
    }
  };

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

  const filteredAddons = activeCategory === "all"
    ? addons
    : addons.filter(addon => addon.ServiceCategories.slug === activeCategory);

  const groupedAddons = filteredAddons.reduce((acc, addon) => {
    const type = addon.addon_type ? "bundles" : "extras";
    if (!acc[type]) acc[type] = [];
    acc[type].push(addon);
    return acc;
  }, {} as Record<string, Addon[]>);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Available Addons</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="all" onClick={() => setActiveCategory("all")}>
            All Categories
          </TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger
              key={category.slug}
              value={category.slug}
              onClick={() => setActiveCategory(category.slug)}
            >
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="space-y-12">
          {groupedAddons.bundles && groupedAddons.bundles.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-6">Bundles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedAddons.bundles.map((addon) => (
                  <Card key={addon.addon_id}>
                    <CardContent className="p-0">
                      {addon.image_link && (
                        <div className="relative h-48 w-full">
                          <Image
                            src={addon.image_link}
                            alt={addon.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-2">
                          {addon.title}
                        </h3>
                        <p className="text-gray-600 mb-4">{addon.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {addon.ServiceCategories.name}
                          </span>
                          <span className="font-semibold">
                            £{addon.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {groupedAddons.extras && groupedAddons.extras.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-6">Extras</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedAddons.extras.map((addon) => (
                  <Card key={addon.addon_id}>
                    <CardContent className="p-0">
                      {addon.image_link && (
                        <div className="relative h-48 w-full">
                          <Image
                            src={addon.image_link}
                            alt={addon.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-2">
                          {addon.title}
                        </h3>
                        <p className="text-gray-600 mb-4">{addon.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {addon.ServiceCategories.name}
                          </span>
                          <span className="font-semibold">
                            £{addon.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </Tabs>
    </div>
  );
} 