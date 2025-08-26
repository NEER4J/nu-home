"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { Addon, Bundle, BundleDiscountType } from "@/types";
import { Edit2, Trash2, ExternalLink } from "lucide-react";

export default function PartnerAddonsPage() {
  const router = useRouter();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Addons");
  const [activeTab, setActiveTab] = useState<'addons' | 'bundles'>("addons");
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [bundleFormOpen, setBundleFormOpen] = useState(false);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [discountType, setDiscountType] = useState<BundleDiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [bundleSelections, setBundleSelections] = useState<Record<string, number>>({});
  const [addonSearch, setAddonSearch] = useState("");
  const [serviceCategories, setServiceCategories] = useState<{ service_category_id: string; name: string }[]>([]);
  const [bundleCategoryId, setBundleCategoryId] = useState<string>('');
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
        await Promise.all([fetchAddons(currentUser.id), fetchBundles(currentUser.id), fetchServiceCategories()]);
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

  const fetchBundles = async (partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from('Bundles')
        .select(`*, BundlesAddons(*, Addons(*))`)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching bundles:', error);
        return;
      }
      setBundles((data || []) as unknown as Bundle[]);
    } catch (e) {
      console.error('Error in fetchBundles:', e);
    }
  };

  const fetchServiceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('ServiceCategories')
        .select('service_category_id, name')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }
      setServiceCategories((data || []) as { service_category_id: string; name: string }[]);
    } catch (e) {
      console.error('Error in fetchServiceCategories:', e);
    }
  };

  const toggleBundleItem = (addonId: string, delta: number) => {
    setBundleSelections(prev => {
      const current = prev[addonId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [addonId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [addonId]: next };
    });
  };

  const selectedBundleItems = useMemo(() => {
    return Object.entries(bundleSelections)
      .map(([addonId, qty]) => {
        const item = addons.find(a => a.addon_id === addonId);
        if (!item) return null;
        return { addon: item, quantity: qty };
      })
      .filter(Boolean) as { addon: Addon; quantity: number }[];
  }, [bundleSelections, addons]);

  const bundleSubtotal = useMemo(() => selectedBundleItems.reduce((s, i) => s + i.addon.price * i.quantity, 0), [selectedBundleItems]);
  const bundleDiscount = useMemo(() => {
    if (discountType === 'fixed') return Math.min(discountValue, bundleSubtotal);
    return Math.min((bundleSubtotal * (discountValue || 0)) / 100, bundleSubtotal);
  }, [discountType, discountValue, bundleSubtotal]);
  const bundleTotal = useMemo(() => Math.max(0, bundleSubtotal - bundleDiscount), [bundleSubtotal, bundleDiscount]);
  const totalBundleQuantity = useMemo(() => selectedBundleItems.reduce((n, i) => n + i.quantity, 0), [selectedBundleItems]);
  const filteredAddonsForBundle = useMemo(() => {
    const term = addonSearch.trim().toLowerCase();
    const byCategory = addons.filter(a => !bundleCategoryId || a.service_category_id === bundleCategoryId);
    if (!term) return byCategory;
    return byCategory.filter(a => a.title.toLowerCase().includes(term));
  }, [addonSearch, bundleCategoryId, addons]);

  const categoryNameById = useMemo(() => Object.fromEntries(serviceCategories.map(c => [c.service_category_id, c.name])), [serviceCategories]);

  const resetBundleForm = () => {
    setBundleTitle('');
    setBundleDescription('');
    setDiscountType('fixed');
    setDiscountValue(0);
    setBundleSelections({});
    setBundleCategoryId('');
    setEditingBundleId(null);
  };

  const handleSaveBundle = async () => {
    if (!user) return;
    if (!bundleTitle.trim() || Object.keys(bundleSelections).length === 0) return;

    const payload: any = {
      partner_id: user.id,
      title: bundleTitle.trim(),
      description: bundleDescription.trim() || null,
      discount_type: discountType,
      discount_value: discountValue,
      service_category_id: bundleCategoryId || null,
    };
    let bundleId = editingBundleId;
    if (!editingBundleId) {
      const { data: bundle, error: bundleErr } = await supabase
        .from('Bundles')
        .insert(payload)
        .select('bundle_id')
        .single();
      if (bundleErr || !bundle) {
        console.error('Failed to create bundle:', bundleErr);
        return;
      }
      bundleId = bundle.bundle_id as string;
    } else {
      const { error: updErr } = await supabase
        .from('Bundles')
        .update(payload)
        .eq('bundle_id', editingBundleId);
      if (updErr) {
        console.error('Failed to update bundle:', updErr);
        return;
      }
      // Clear old items
      await supabase.from('BundlesAddons').delete().eq('bundle_id', editingBundleId);
    }

    const items = Object.entries(bundleSelections).map(([addon_id, quantity]) => ({ bundle_id: bundleId!, addon_id, quantity }));
    if (items.length > 0) {
      const { error: itemsErr } = await supabase.from('BundlesAddons').insert(items);
      if (itemsErr) {
        console.error('Failed to save bundle items:', itemsErr);
      }
    }

    await fetchBundles(user.id);
    resetBundleForm();
    setBundleFormOpen(false);
  };

  const handleEditBundle = (b: any) => {
    // Prefill modal from existing bundle
    setEditingBundleId(b.bundle_id);
    setBundleTitle(b.title || '');
    setBundleDescription(b.description || '');
    setDiscountType((b.discount_type as BundleDiscountType) || 'fixed');
    setDiscountValue(Number(b.discount_value || 0));
    setBundleCategoryId(b.service_category_id || '');
    const selections: Record<string, number> = {};
    (b.BundlesAddons || []).forEach((bi: any) => {
      selections[bi.addon_id] = bi.quantity || 1;
    });
    setBundleSelections(selections);
    setBundleFormOpen(true);
  };

  const handleDeleteBundle = async (bundleId: string) => {
    if (!user) return;
    const confirmDelete = window.confirm('Delete this bundle? This cannot be undone.');
    if (!confirmDelete) return;
    const { error } = await supabase.from('Bundles').delete().eq('bundle_id', bundleId);
    if (error) {
      console.error('Failed to delete bundle:', error);
      return;
    }
    await fetchBundles(user.id);
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
    <div className="max-w-[1500px] mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Addons</h1>
        <div className="flex gap-2">
          {activeTab === 'addons' && (
            <button 
              onClick={() => router.push("/partner/addons/new")}
              className="inline-flex justify-center py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add New Addon
            </button>
          )}
          {activeTab === 'bundles' && (
            <button 
              onClick={() => setBundleFormOpen(true)}
              className="inline-flex justify-center py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Bundle
            </button>
          )}
        </div>
      </div>

      {/* Section tabs: Addons | Bundles */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px space-x-8 overflow-x-auto" aria-label="Section Tabs">
          {[
            { key: 'addons', label: 'Addons' },
            { key: 'bundles', label: 'Bundles' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as 'addons' | 'bundles')}
              className={`py-4 px-1 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

          {activeTab === 'addons' && (
        <>
          {/* Category filter tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="flex -mb-px space-x-8 overflow-x-auto" aria-label="Category Tabs">
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
              <div className="p-6 text-center text-gray-500">No addons found. Click "Add New Addon" to create one.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredAddons.map((addon) => (
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
                        <button onClick={() => window.open(`/addons/${addon.addon_id}`, '_blank')} className="text-blue-600 hover:text-blue-800" title="View">
                          <ExternalLink className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(addon.addon_id)} className="text-red-600 hover:text-red-800" title="Delete">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

          {activeTab === 'bundles' && (
        <>
          {/* Bundle create/edit drawer/modal */}
          {bundleFormOpen && (
            <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-lg max-w-[1500px] w-full max-h-[92vh] overflow-hidden">
                <div className="p-4 sm:p-6 border-b flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Create Bundle</h2>
                    <p className="text-sm text-gray-500">Combine multiple addons and offer a discount.</p>
                  </div>
                  <button className="text-gray-500 hover:text-gray-700" onClick={() => { setBundleFormOpen(false); }}>
                    Close
                  </button>
                </div>
                <div className="grid lg:grid-cols-3 gap-6 p-4 sm:p-6 h-[calc(92vh-72px)]">
                  {/* Left column */}
                  <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-1">
                    {/* Bundle details card */}
                    <div className="bg-white border rounded-lg p-4 sm:p-5 shadow-sm">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bundle title</label>
                          <input value={bundleTitle} onChange={e => setBundleTitle(e.target.value)} className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Installation Essentials" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea value={bundleDescription} onChange={e => setBundleDescription(e.target.value)} className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Describe this bundle" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Discount type</label>
                          <select value={discountType} onChange={e => setDiscountType(e.target.value as BundleDiscountType)} className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="fixed">Fixed amount (£)</option>
                            <option value="percent">Percentage (%)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Discount value</label>
                          <input type="number" value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} min={0} className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bundle category</label>
                          <select value={bundleCategoryId} onChange={e => setBundleCategoryId(e.target.value)} className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">None (all categories)</option>
                            {serviceCategories.map(c => (
                              <option key={c.service_category_id} value={c.service_category_id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Addons selector card */}
                    <div className="bg-white border rounded-lg p-4 sm:p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4 gap-3">
                        <h3 className="text-md font-semibold text-gray-900">Select addons</h3>
                        <div className="flex items-center gap-3">
                          <div className="hidden sm:block text-xs text-gray-500">Selected: {selectedBundleItems.length} items • Qty: {totalBundleQuantity}</div>
                          {bundleCategoryId && (
                            <span className="hidden sm:inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              {categoryNameById[bundleCategoryId] || 'Category'}
                            </span>
                          )}
                          <input
                            value={addonSearch}
                            onChange={e => setAddonSearch(e.target.value)}
                            placeholder="Search addons..."
                            className="w-48 sm:w-64 border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="pr-1">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                          {filteredAddonsForBundle.map(a => {
                            const qty = bundleSelections[a.addon_id] || 0;
                            return (
                              <div key={a.addon_id} className={`group border rounded-lg p-3 transition-shadow bg-white ${qty ? 'border-blue-500 shadow' : 'border-gray-200 hover:shadow-sm'}`}>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-center">
                                    <div className="h-14 w-14 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                      {a.image_link ? (
                                        <img src={a.image_link} alt={a.title} className="h-full w-full object-cover" />
                                      ) : (
                                        <span className="text-gray-400 text-xs">No image</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="min-h-[44px]">
                                    <div className="font-medium text-sm line-clamp-2 leading-snug" title={a.title}>{a.title}</div>
                                    <div className="text-xs text-gray-600 mt-1">£{a.price.toFixed(2)}</div>
                                  </div>
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      className="w-8 h-8 inline-flex items-center justify-center rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                                      onClick={() => toggleBundleItem(a.addon_id, -1)}
                                      disabled={!qty}
                                      aria-label={`Decrease ${a.title}`}
                                    >
                                      −
                                    </button>
                                    <span className="w-6 text-center text-sm">{qty}</span>
                                    <button
                                      className="w-8 h-8 inline-flex items-center justify-center rounded-full border text-gray-700 hover:bg-gray-50"
                                      onClick={() => toggleBundleItem(a.addon_id, 1)}
                                      aria-label={`Increase ${a.title}`}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {filteredAddonsForBundle.length === 0 && (
                          <div className="text-center text-sm text-gray-500 py-8">No addons match "{addonSearch}"</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary column */}
                  <div className="lg:col-span-1">
                    <div className="bg-white border rounded-lg p-4 sm:p-5 shadow-sm lg:sticky lg:top-6">
                      <h3 className="font-semibold mb-3">Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Items</span><span>{selectedBundleItems.length}</span></div>
                        <div className="flex justify-between"><span>Total qty</span><span>{totalBundleQuantity}</span></div>
                        <div className="flex justify-between"><span>Subtotal</span><span>£{bundleSubtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Discount</span><span>-£{bundleDiscount.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>£{bundleTotal.toFixed(2)}</span></div>
                      </div>

                      <div className="mt-4 grid gap-2">
                        <button onClick={handleSaveBundle} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50" disabled={!bundleTitle.trim() || selectedBundleItems.length === 0}>
                          Save Bundle
                        </button>
                        <button onClick={resetBundleForm} className="w-full border py-2 rounded-md">Reset</button>
                        <button onClick={() => setBundleFormOpen(false)} className="w-full text-gray-600 py-2 rounded-md hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Bundles</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {bundles.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No bundles yet. Click "Create Bundle" to make one.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {bundles.map(b => {
                  const items = (b as any).BundlesAddons || [];
                  const images = items.map((bi: any) => bi.Addons?.image_link).filter(Boolean).slice(0, 4) as string[];
                  const itemCount = items.reduce((n: number, bi: any) => n + (Number(bi.quantity) || 0), 0);
                  const subtotal = items.reduce((s: number, bi: any) => s + (Number(bi.Addons?.price) || 0) * (Number(bi.quantity) || 0), 0);
                  const discountVal = Number(b.discount_value || 0);
                  const discountAmt = (b.discount_type === 'percent') ? Math.min(subtotal * (discountVal / 100), subtotal) : Math.min(discountVal, subtotal);
                  const total = Math.max(0, subtotal - discountAmt);
                  return (
                    <li key={b.bundle_id} className="px-4 sm:px-6 py-6">
                      <div className="">
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: thumbnails */}
                          <div className="hidden sm:block">
                            {images.length > 0 && (
                              <div className="flex -space-x-2">
                                {images.map((src, idx) => (
                                  <img key={idx} src={src} alt="Addon" className="w-9 h-9 rounded-full ring-2 ring-white object-cover" />
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Middle: title, desc and stats */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900 truncate">{b.title}</h3>
                              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                {b.discount_type === 'percent' ? `${discountVal}% off` : `£${discountVal.toFixed(2)} off`}
                              </span>
                              {b.service_category_id && (
                                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                  {categoryNameById[b.service_category_id] || 'Category'}
                                </span>
                              )}
                              {items.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {items.map((bi: any) => (
                                  <span key={bi.bundle_addon_id} className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                                    {bi.Addons?.title || 'Addon'} × {bi.quantity}
                                  </span>
                                ))}
                              </div>
                            )}
                            </div>
                              

                            {/* Stats */}
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div className="bg-gray-50 rounded-md px-3 py-2 flex items-center justify-center gap-2">
                                <div className="text-gray-500">Items</div>
                                <div className="font-medium text-gray-900">{itemCount}</div>
                              </div>
                              <div className="bg-gray-50 rounded-md px-3 py-2 flex items-center justify-center gap-2">
                                <div className="text-gray-500">Subtotal</div>
                                <div className="font-medium text-gray-900">£{subtotal.toFixed(2)}</div>
                              </div>
                              <div className="bg-gray-50 rounded-md px-3 py-2 flex items-center justify-center gap-2">
                                <div className="text-gray-500">Discount</div>
                                <div className="font-medium text-gray-900">-£{discountAmt.toFixed(2)}</div>
                              </div>
                              <div className="bg-gray-50 rounded-md px-3 py-2 flex items-center justify-center gap-2">
                                <div className="text-gray-500">Total</div>
                                <div className="font-semibold text-gray-900">£{total.toFixed(2)}</div>
                              </div>
                            </div>

                          
                          </div>

                          {/* Right: actions */}
                          <div className="shrink-0 flex items-center gap-1">
                            <button
                              className="px-2 py-1.5 text-sm text-blue-700 border-blue-200"
                              onClick={() => handleEditBundle(b)}
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              className="px-2 py-1.5 text-sm text-red-700"
                              onClick={() => handleDeleteBundle(b.bundle_id)}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
} 