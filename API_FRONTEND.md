## API Documentation (Frontend-ready)

- **Base URL**: `https://<your-api-domain>`
- **Auth**: JWT Bearer where noted
  - Header: `Authorization: Bearer <token>`
- All endpoints return JSON.

## Listings

### Get listings (and count them)
- **Method**: GET
- **URL**: `/listings`
- **Auth**: optional (if authenticated, your own listings may be excluded automatically)
- **Query params** (all optional):
  - `providerId`: string (filter by provider)
  - `categoryId`: string
  - `subCategoryId`: string
  - `text` or `searchText`: string (description search; also auto-maps to category/subcategory names)
  - `latitude`: number, `longitude`: number, `radius`: number (km) — distance search
  - `coordinates`: JSON string like `[lng,lat]`, `distance`: number (km) — alternative geo format
  - `isActive`: boolean (default true)
- **Returns**: array of listings; count = `array.length`

Example (curl):
```bash
curl -X GET "$API_URL/listings?text=tractor&latitude=12.9&longitude=77.6&radius=25" \
  -H "Authorization: Bearer $TOKEN"
```

Example (TypeScript):
```ts
const res = await fetch(`${API_URL}/listings?text=tractor`);
const listings = await res.json();
const count = listings.length;
```

Listing (shape excerpt):
```json
{
  "_id": "LISTING_ID",
  "title": "string",
  "description": "string",
  "price": 123,
  "unitOfMeasure": "per_hour|per_day|per_piece|per_kg|per_unit",
  "isActive": true,
  "viewCount": 0,
  "bookingCount": 0,
  "categoryId": {"_id":"...","name":"..."},
  "subCategoryId": {"_id":"...","name":"..."},
  "providerId": {"_id":"...","name":"...","phone":"..."},
  "photoUrls": ["https://..."],
  "location": { "type": "Point", "coordinates": [lng, lat] },
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

### Get a provider’s active listings count (fast path)
- **Method**: GET
- **URL**: `/providers/{providerId}/dashboard`
- **Auth**: optional
- **Returns**: includes `summary.activeListings` number (active listings count)

Example (TypeScript):
```ts
const res = await fetch(`${API_URL}/providers/${providerId}/dashboard`);
const { summary } = await res.json();
const activeListingsCount = summary.activeListings;
```

## Bookings / Orders

### Get provider booking counts (summary)
- **Method**: GET
- **URL**: `/orders/provider/{providerId}/summary`
- **Auth**: optional
- **Returns**:
```json
{ "totalOrders": 10, "fulfilledOrders": 7, "revenue": 12345 }
```

Example (TypeScript):
```ts
const res = await fetch(`${API_URL}/orders/provider/${providerId}/summary`);
const { totalOrders, fulfilledOrders, revenue } = await res.json();
```

### Get provider dashboard (also includes booking counts)
- **Method**: GET
- **URL**: `/providers/{providerId}/dashboard`
- **Returns**:
```json
{
  "summary": {
    "totalBookings": 10,
    "completedBookings": 7,
    "revenue": 12345,
    "activeListings": 3,
    "averageRating": 4.5,
    "totalRatings": 12
  },
  "recentBookings": [ ]
}
```

### Get a seeker’s bookings (for list/count)
- **Method**: GET
- **URL**: `/orders/seeker/{seekerId}`
- **Returns**: array of orders; count = `array.length`

Example (TypeScript):
```ts
const res = await fetch(`${API_URL}/orders/seeker/${seekerId}`);
const orders = await res.json();
const count = orders.length;
```

### Get provider booking lists (categorized)
- **Method**: GET `/providers/{providerId}/bookings`
  - Returns: `{ active: Order[], completed: Order[], canceled: Order[], toReview: Order[] }`
- **Method**: GET `/providers/{providerId}/bookings/active`
- **Method**: GET `/providers/{providerId}/bookings/completed`
- **Method**: GET `/providers/{providerId}/bookings/to-review`

## User Preferences (Preferred Landing Page)

### Update current user’s preferences (recommended)
- **Method**: PATCH
- **URL**: `/providers/preferences`
- **Auth**: required (JWT)
- **Body** (any subset):
```json
{
  "defaultLandingPage": "provider|seeker",
  "defaultProviderTab": "active|completed|review|<custom>",
  "preferredLanguage": "string",
  "notificationsEnabled": true
}
```
- **Returns**: updated user (including `preferences`)

Example (curl):
```bash
curl -X PATCH "$API_URL/providers/preferences" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"defaultLandingPage":"provider"}'
```

### Update preferences by user id (alternative)
- **Method**: PATCH
- **URL**: `/users/{id}`
- **Auth**: required
- **Body**:
```json
{ "preferences": { "defaultLandingPage": "seeker" } }
```
- **Returns**: `{ message, user: { id, name, email, phone, role, isVerified, kycStatus } }`
  - Note: this response omits `preferences`, even though they are updated.

## Profile

### Get profile
- **Method**: GET
- **URL**: `/users/{id}`
- **Returns**:
```json
{
  "id": "USER_ID",
  "name": "string",
  "email": "string|null",
  "phone": "string",
  "role": "individual|SHG|FPO|admin",
  "isVerified": false,
  "kycStatus": "none|pending|approved|rejected"
}
```

### Update profile
- **Method**: PATCH
- **URL**: `/users/{id}`
- **Auth**: required
- **Body** (any subset):
```json
{
  "name": "string",
  "phone": "string",
  "isVerified": true,
  "kycStatus": "none|pending|approved|rejected",
  "preferences": {
    "defaultLandingPage": "provider|seeker",
    "defaultProviderTab": "active|completed|review|<custom>",
    "preferredLanguage": "string",
    "notificationsEnabled": true
  },
  "defaultAddressId": "MONGO_ID"
}
```
- **Returns**:
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "USER_ID",
    "name": "string",
    "email": "string|null",
    "phone": "string",
    "role": "individual|SHG|FPO|admin",
    "isVerified": false,
    "kycStatus": "none"
  }
}
```

## Notes and tips
- **Counting**: There are no dedicated “count-only” endpoints for listings or seeker bookings; count by taking `array.length` or use the dashboard/summary endpoints where provided.
- **Geo search**: Prefer `latitude`, `longitude`, `radius` (km). Alternatively send `coordinates=[lng,lat]` (as a JSON string) with `distance` (km).
- **Auth**: Some controllers rely on JWT being set globally; always send Authorization when mutating or when user context is needed.


