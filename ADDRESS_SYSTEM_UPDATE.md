# Address System Update

## Overview
This update enhances the postcode and address system to use the new webuildapi.com service and save comprehensive address data to the database.

## Changes Made

### 1. API Updates

#### New API Endpoints
- **`/api/places/suggestions`** - New endpoint for postcode suggestions
- **`/api/partner-leads/update-address`** - New endpoint to save address data to database

#### Updated API Endpoints
- **`/api/places`** - Updated to use webuildapi.com instead of Google Places API

### 2. Database Schema Updates

#### New Columns Added to `partner_leads` Table
```sql
-- New address fields
address_line_1 character varying(255) NULL,
address_line_2 character varying(255) NULL,
street_name character varying(255) NULL,
street_number character varying(50) NULL,
building_name character varying(255) NULL,
sub_building character varying(100) NULL,
county character varying(255) NULL,
country character varying(100) NULL DEFAULT 'United Kingdom',
address_type character varying(50) NULL DEFAULT 'residential',
formatted_address text NULL
```

#### New Indexes
- `partner_leads_address_line_1_idx`
- `partner_leads_street_name_idx`
- `partner_leads_town_city_idx`
- `partner_leads_county_idx`
- `partner_leads_address_type_idx`

### 3. PostcodeStep Component Enhancements

#### New Features
- **Postcode Suggestions**: Shows suggestions as users type (2+ characters)
- **Enhanced Address Lookup**: Uses webuildapi.com for better UK address data
- **Comprehensive Manual Address Form**: Includes all address fields
- **Database Integration**: Automatically saves address data to database

#### Manual Address Form Fields
- House/Flat Number
- Street Name *
- Building Name
- Unit/Flat Number
- Address Line 1 *
- Address Line 2
- Town/City *
- County
- Postcode *
- Country

#### Address Data Structure
```typescript
interface Address {
  address_line_1: string
  address_line_2?: string
  street_name?: string
  street_number?: string
  building_name?: string
  sub_building?: string
  town_or_city: string
  county?: string
  postcode: string
  formatted_address: string
  country?: string
}
```

### 4. Environment Variables Required

Add to your `.env.local` file:
```env
WEBUILD_API_KEY=your_webuild_api_key_here
```

### 5. Database Migration

Run the migration to add new address fields:
```sql
-- File: supabase/migrations/20250117_add_address_fields_to_partner_leads.sql
```

### 6. Usage

#### PostcodeStep Component Props
```typescript
interface PostcodeStepProps {
  value: string;
  onValueChange: (postcode: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  companyColor?: string;
  submissionId?: string; // New prop for database integration
}
```

#### Address Data Storage
Address data is stored in two places:
1. **Individual columns** for easy querying
2. **form_answers JSONB** for complete data preservation

### 7. API Response Examples

#### Postcode Suggestions
```json
{
  "suggestions": [
    {
      "postcode": "SW1A 1AA",
      "address": "Buckingham Palace, London"
    }
  ],
  "count": 1
}
```

#### Address Lookup
```json
{
  "addresses": [
    {
      "address_line_1": "19 Hereward Rise",
      "street_name": "Hereward Rise",
      "street_number": "19",
      "town_or_city": "Dudley",
      "postcode": "B62 8AN",
      "formatted_address": "19 Hereward Rise, Dudley, B62 8AN"
    }
  ],
  "count": 1
}
```

### 8. Benefits

1. **Better Address Data**: webuildapi.com provides more accurate UK address data
2. **Postcode Suggestions**: Improves user experience with live suggestions
3. **Comprehensive Storage**: All address details are preserved in the database
4. **Flexible Querying**: Both individual columns and JSONB storage for different use cases
5. **Enhanced Manual Entry**: Complete address form with all necessary fields
6. **Database Integration**: Automatic saving of address data during the quote process

### 9. Migration Notes

- Existing records will be updated to populate new fields from `form_answers` if available
- New submissions will automatically populate both individual columns and JSONB storage
- Backward compatibility is maintained with existing code

### 10. Testing

Test the following scenarios:
1. Postcode suggestions (type 2+ characters)
2. Address selection from dropdown
3. Manual address entry with all fields
4. Database saving functionality
5. Address data retrieval from database
