'use client';

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
}

interface FieldMapping {
  [key: string]: string;
}

interface ProductPreviewProps {
  products: WordPressProduct[];
  mapping: FieldMapping;
}

const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export function ProductPreview({ products, mapping }: ProductPreviewProps) {
  const getMappedValue = (product: WordPressProduct, field: string) => {
    const mappedPath = mapping[field];
    if (!mappedPath) return null;
    return getNestedValue(product, mappedPath);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Preview of Mapped Products</h3>
      <div className="h-[500px] overflow-y-auto">
        <div className="grid gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h4 className="text-lg font-medium">
                  {getMappedValue(product, 'name') || 'Unnamed Product'}
                </h4>
              </div>
              <div className="p-4">
                <div className="grid gap-2">
                  {Object.entries(mapping).map(([field, path]) => {
                    const value = getMappedValue(product, field);
                    if (value === null || value === undefined) return null;

                    return (
                      <div key={field} className="flex items-start gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {field}
                        </span>
                        <div className="text-sm">
                          {Array.isArray(value)
                            ? value.join(', ')
                            : typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 