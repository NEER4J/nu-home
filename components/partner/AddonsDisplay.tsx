"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Edit2, Trash2 } from "lucide-react";
import LayoutSwitcher from "@/components/partner/LayoutSwitcher";

interface Addon {
  addon_id: string;
  title: string;
  price: number;
  image_link?: string;
  ServiceCategories?: {
    name: string;
  };
}

interface AddonsDisplayProps {
  addons: Addon[];
  onDelete: (addonId: string) => void;
}

export default function AddonsDisplay({ addons, onDelete }: AddonsDisplayProps) {
  const router = useRouter();
  const [layout, setLayout] = useState<'list' | 'grid'>('list');

  if (addons.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">No addons found. Click "Add New Addon" to create one.</div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Your Addons</h2>
        <LayoutSwitcher currentLayout={layout} onLayoutChange={setLayout} />
      </div>

      {layout === 'list' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {addons.map((addon) => (
              <li key={addon.addon_id}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    {addon.image_link ? (
                      <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md overflow-hidden">
                        <Image src={addon.image_link} alt={addon.title} width={64} height={64} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 truncate">{addon.title}</h3>
                      <p className="text-sm text-gray-500">{addon.ServiceCategories?.name || "Uncategorized"}</p>
                      <p className="text-sm font-medium text-gray-900">£{addon.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 ml-4 space-x-2">
                    <button onClick={() => router.push(`/partner/addons/${addon.addon_id}`)} className="text-blue-600 hover:text-blue-800" title="Edit">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => onDelete(addon.addon_id)} className="text-red-600 hover:text-red-800" title="Delete">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {addons.map((addon) => (
            <div key={addon.addon_id} className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
              <div className="h-48 w-full relative bg-gray-100">
                {addon.image_link ? (
                  <Image
                    src={addon.image_link}
                    alt={addon.title}
                    fill
                    className="object-contain p-5"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No image</span>
                  </div>
                )}
              </div>
              <div className="px-4 py-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">{addon.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {addon.ServiceCategories?.name || "Uncategorized"}
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  £{addon.price.toFixed(2)}
                </p>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => router.push(`/partner/addons/${addon.addon_id}`)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(addon.addon_id)}
                    className="px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:text-red-800 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
