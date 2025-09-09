import { useState, useEffect } from 'react';
import { FieldMapper } from './FieldMapper';

interface SubField {
  key: string;
  label: string;
  type: string;
  options?: string[];
  subfields?: SubField[];
}

interface WordPressField {
  path: string;
  label: string;
  type: string;
  options?: string[];
  subfields?: SubField[];
  isRepeaterItem?: boolean;
  repeaterIndex?: number;
  repeaterField?: string;
  uniqueKey?: string;
}

interface DatabaseField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

// Initialize WordPress fields based on the API response structure
const initialWordPressFields: WordPressField[] = [
  {
    path: 'title.rendered',
    label: 'Title',
    type: 'string'
  },
  {
    path: 'slug',
    label: 'Slug',
    type: 'string'
  },
  {
    path: 'featured_media',
    label: 'Featured Media ID',
    type: 'number'
  },
  {
    path: 'featured_image_src_large',
    label: 'Featured Image URL',
    type: 'array'
  },
  {
    path: 'acf',
    label: 'ACF',
    type: 'object',
    subfields: [
      {
        key: 'subtitle_1',
        label: 'Subtitle',
        type: 'string'
      },
      {
        key: 'year_warranty',
        label: 'Year Warranty',
        type: 'string'
      },
      {
        key: 'select_brand',
        label: 'Select Brand',
        type: 'string'
      },
      {
        key: 'boiler_description',
        label: 'Boiler Description',
        type: 'repeater',
        subfields: [
          {
            key: 'description_item',
            label: 'Description Item',
            type: 'string'
          }
        ]
      },
      {
        key: 'boiler_fixed_price',
        label: 'Boiler Fixed Price',
        type: 'number'
      },
      {
        key: 'boiler_power_price',
        label: 'Boiler Power Price',
        type: 'repeater',
        subfields: [
          {
            key: 'price',
            label: 'Price',
            type: 'number'
          },
          {
            key: 'power',
            label: 'Power',
            type: 'string'
          },
          {
            key: 'flow_rate',
            label: 'Flow Rate',
            type: 'string'
          }
        ]
      },
      {
        key: 'boiler_flow_rate',
        label: 'Boiler Flow Rate',
        type: 'string'
      },
      {
        key: 'boiler_dimetions',
        label: 'Boiler Dimensions',
        type: 'object',
        subfields: [
          {
            key: 'height',
            label: 'Height',
            type: 'string'
          },
          {
            key: 'width',
            label: 'Width',
            type: 'string'
          },
          {
            key: 'depth',
            label: 'Depth',
            type: 'string'
          }
        ]
      },
      {
        key: 'boiler_details',
        label: 'Boiler Details',
        type: 'repeater',
        subfields: [
          {
            key: 'icon',
            label: 'Icon',
            type: 'number'
          },
          {
            key: 'text',
            label: 'Text',
            type: 'string'
          }
        ]
      }
    ]
  },
  {
    path: 'taxonomy_info',
    label: 'Taxonomy Info',
    type: 'object',
    subfields: [
      {
        key: 'boilertype',
        label: 'Boiler Type',
        type: 'array'
      },
      {
        key: 'bedroom_fits_boiler',
        label: 'Bedroom Fits Boiler',
        type: 'array'
      }
    ]
  }
];

export function ImportWizard() {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [databaseFields, setDatabaseFields] = useState<DatabaseField[]>([]);

  // Flatten the WordPress fields for the FieldMapper
  const flattenedWordPressFields = initialWordPressFields.reduce((acc: WordPressField[], field) => {
    // For non-object fields, add them directly
    if (field.type !== 'object') {
      acc.push(field);
      return acc;
    }

    // For object fields with subfields
    if (field.subfields) {
      field.subfields.forEach(subfield => {
        const fullPath = `${field.path}.${subfield.key}`;
        
        if (subfield.type === 'repeater' && subfield.subfields) {
          // Add the repeater field itself
          acc.push({
            path: fullPath,
            label: `${field.label} - ${subfield.label}`,
            type: 'repeater',
            subfields: subfield.subfields,
            // Add a unique identifier for the repeater
            uniqueKey: `${field.path}-${subfield.key}-repeater`
          });
        } else if (subfield.type === 'object' && subfield.subfields) {
          // Handle nested object fields
          subfield.subfields.forEach(nestedField => {
            acc.push({
              path: `${fullPath}.${nestedField.key}`,
              label: `${field.label} - ${subfield.label} - ${nestedField.label}`,
              type: nestedField.type,
              uniqueKey: `${field.path}-${subfield.key}-${nestedField.key}`
            });
          });
        } else {
          // Add regular fields
          acc.push({
            path: fullPath,
            label: `${field.label} - ${subfield.label}`,
            type: subfield.type,
            uniqueKey: `${field.path}-${subfield.key}`
          });
        }
      });
    }

    return acc;
  }, []);

  // Update the WordPressField interface to include uniqueKeys
  const fieldsWithUniqueKeys = flattenedWordPressFields.map(field => ({
    ...field,
    uniqueKey: field.uniqueKey || `${field.path}-${field.type}`
  }));

  console.log('Flattened fields with unique keys:', fieldsWithUniqueKeys);

  return (
    <div className="p-6">
      <FieldMapper
        wordpressFields={fieldsWithUniqueKeys}
        databaseFields={databaseFields}
        mapping={mapping}
        onMappingChange={setMapping}
      />
    </div>
  );
} 