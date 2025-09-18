# Field Mapping Engine Template Processing Examples

## Overview
The enhanced Field Mapping Engine now supports both simple templates and complex nested loops with the following features:

1. **Simple Template Processing**: Fast processing for basic variable replacement
2. **Nested Loop Support**: Handles loops inside loops with unlimited depth
3. **Nested Property Access**: Supports `{{product_fields.warranty}}` syntax
4. **Context-Aware Processing**: Automatically chooses the right processing method

## Simple Template Examples

### Basic Variable Replacement
```html
<div>
  <h1>{{companyName}}</h1>
  <p>Contact: {{companyPhone}}</p>
  <p>Email: {{email}}</p>
</div>
```

### Nested Property Access
```html
<div>
  <h2>{{products_name}}</h2>
  <p>Warranty: {{product_fields.warranty}} years</p>
  <p>Flow Rate: {{product_fields.flow_rate}} L/min</p>
  <p>Type: {{product_fields.boiler_type}}</p>
</div>
```

## Complex Template with Nested Loops

### Main Product Loop
```html
<div class="products">
  {{#each this}}
    <div class="product-card">
      <h2>{{name}}</h2>
      <p>Price: £{{price}}</p>
      <img src="{{image_url}}" alt="{{name}}" />
      
      <!-- Nested loop for specs -->
      <h3>Specifications</h3>
      <ul>
        {{#each product_fields.specs}}
          <li>{{items}}</li>
        {{/each}}
      </ul>
      
      <!-- Nested loop for what's included -->
      <h3>What's Included</h3>
      <ul>
        {{#each product_fields.what_s_included}}
          <li>
            <img src="{{items.image}}" alt="{{items.title}}" />
            <strong>{{items.title}}</strong>
            <span>{{items.subtitle}}</span>
          </li>
        {{/each}}
      </ul>
      
      <!-- Nested loop for image gallery -->
      <h3>Gallery</h3>
      <div class="gallery">
        {{#each product_fields.image_gallery}}
          <img src="{{image}}" alt="Gallery image" />
        {{/each}}
      </div>
      
      <!-- Nested loop for highlighted features -->
      <h3>Features</h3>
      <ul>
        {{#each product_fields.highlighted_features}}
          <li>
            <img src="{{image}}" alt="{{name}}" />
            <span>{{name}}</span>
          </li>
        {{/each}}
      </ul>
    </div>
  {{/each}}
</div>
```

## Data Structure Example

```javascript
const productData = [
  {
    name: "Worcester Greenstar 4000",
    price: 2985,
    image_url: "https://example.com/boiler.jpg",
    product_fields: {
      warranty: "12",
      flow_rate: "10.9",
      boiler_type: "Combi",
      specs: [
        { items: "10 years warranty" },
        { items: "Hydrogen blend ready" },
        { items: "94% efficient" }
      ],
      what_s_included: [
        {
          items: {
            image: "https://example.com/item1.png",
            title: "Worcester Bosch Greenstar 4000",
            subtitle: ""
          }
        },
        {
          items: {
            image: "https://example.com/item2.png",
            title: "System Flush",
            subtitle: "A chemical flush of your system"
          }
        }
      ],
      image_gallery: [
        { image: "https://example.com/gallery1.png" },
        { image: "https://example.com/gallery2.png" }
      ],
      highlighted_features: [
        {
          name: "Low monthly payments available",
          image: "https://example.com/feature1.png"
        },
        {
          name: "Popular model",
          image: "https://example.com/feature2.png"
        }
      ]
    }
  }
]
```

## Processing Features

### 1. Automatic Template Detection
- **Simple Templates**: Uses fast processing for templates without `{{#each}}`
- **Complex Templates**: Uses full Handlebars processing for templates with loops

### 2. Nested Loop Processing
- Supports unlimited nesting depth
- Each loop level processes its own context
- Prevents infinite loops with iteration limits

### 3. Context-Aware Variable Replacement
- `{{#each this}}` - loops over the main data array
- `{{#each product_fields.specs}}` - loops over nested arrays
- `{{name}}` - simple variable replacement
- `{{product_fields.warranty}}` - nested property access

### 4. Error Handling
- Graceful handling of missing data
- Fallback to empty strings for undefined values
- Maximum iteration limits to prevent infinite loops

## Usage in Field Mappings

When creating field mappings, you can use either:

1. **Simple Template Type**: For basic variable replacement
2. **HTML Template Type with Custom**: For complex templates with loops

The engine automatically detects the template complexity and uses the appropriate processing method.

## Performance Considerations

- **Simple Templates**: Very fast processing with minimal overhead
- **Complex Templates**: More processing time but supports full Handlebars functionality
- **Nested Loops**: Each level adds processing time, but supports unlimited depth
- **Caching**: Consider caching processed templates for frequently used data
