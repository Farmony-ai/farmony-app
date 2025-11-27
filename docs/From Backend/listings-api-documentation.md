
# Listings API Documentation

This document provides a comprehensive guide to the Listings API for frontend engineers. It covers everything you need to know to interact with the listings and availabilities endpoints.

## Listings API

The Listings API is used to manage listings in the application.

### Data Model: `Listing`

The `Listing` object has the following structure:

```typescript
{
  "_id": "string", // Unique identifier for the listing
  "providerId": "string", // ID of the user who created the listing
  "title": "string",
  "description": "string",
  "categoryId": "string",
  "subCategoryId": "string",
  "photos": ["string"], // Array of photo URLs
  "videoUrl": "string",
  "location": {
    "type": "Point",
    "coordinates": [longitude, latitude]
  },
  "price": "number",
  "unitOfMeasure": "string", // e.g., 'per_hour', 'per_day'
  "minimumOrder": "number",
  "availableFrom": "Date",
  "availableTo": "Date",
  "isActive": "boolean",
  "viewCount": "number",
  "bookingCount": "number",
  "tags": ["string"],
  "termsAndConditions": "string",
  "isVerified": "boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Endpoints

#### Create a new listing

- **Method:** `POST`
- **URL:** `/listings`
- **Body:** `CreateListingDto`

```typescript
// CreateListingDto
{
  "providerId": "string",
  "title": "string",
  "description": "string",
  "categoryId": "string",
  "subCategoryId": "string",
  "photos": ["string"],
  "videoUrl": "string",
  "coordinates": [longitude, latitude],
  "price": "number",
  "unitOfMeasure": "string",
  "minimumOrder": "number",
  "availableFrom": "string" // ISO 8601 date string
  "availableTo": "string" // ISO 8601 date string
  "isActive": "boolean",
  "tags": ["string"],
  "termsAndConditions": "string"
}
```

#### Get all listings

- **Method:** `GET`
- **URL:** `/listings`

#### Get listings by provider

- **Method:** `GET`
- **URL:** `/listings/provider/:providerId`

#### Get a single listing by ID

- **Method:** `GET`
- **URL:** `/listings/:id`

#### Update a listing

- **Method:** `PATCH`
- **URL:** `/listings/:id`
- **Body:** `UpdateListingDto` (same as `CreateListingDto`, but all fields are optional)

#### Delete a listing

- **Method:** `DELETE`
- **URL:** `/listings/:id`

## Availabilities API

The Availabilities API is used to manage the availability of a listing.

### Data Model: `Availability`

The `Availability` object has the following structure:

```typescript
{
  "_id": "string",
  "listingId": "string",
  "startDate": "Date",
  "endDate": "Date",
  "availableDays": ["string"], // e.g., ["monday", "tuesday"]
  "timeSlots": [
    {
      "start": "string", // "HH:mm"
      "end": "string" // "HH:mm"
    }
  ],
  "isRecurring": "boolean",
  "recurringPattern": "string", // 'daily', 'weekly', 'monthly'
  "blockedDates": ["Date"],
  "isActive": "boolean",
  "notes": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Endpoints

#### Create a new availability

- **Method:** `POST`
- **URL:** `/availabilities`
- **Body:** `CreateAvailabilityDto`

```typescript
// CreateAvailabilityDto
{
  "listingId": "string",
  "startDate": "string", // ISO 8601 date string
  "endDate": "string", // ISO 8601 date string
  "availableDays": ["string"],
  "timeSlots": [
    {
      "start": "string", // "HH:mm"
      "end": "string" // "HH:mm"
    }
  ],
  "isRecurring": "boolean",
  "recurringPattern": "string",
  "blockedDates": ["string"], // Array of ISO 8601 date strings
  "isActive": "boolean",
  "notes": "string"
}
```

#### Get availabilities for a listing

- **Method:** `GET`
- **URL:** `/availabilities/listing/:listingId`

#### Update an availability

- **Method:** `PATCH`
- **URL:** `/availabilities/:id`
- **Body:** `UpdateAvailabilityDto` (same as `CreateAvailabilityDto`, but all fields are optional)

#### Delete an availability

- **Method:** `DELETE`
- **URL:** `/availabilities/:id`
