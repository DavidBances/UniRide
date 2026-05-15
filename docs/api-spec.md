# UniRide – API Specification

REST API specification for the **UniRide ride-sharing platform**.

This document defines the **HTTP endpoints, request formats, response structures, and rules** used by the UniRide backend.

The API supports the main workflow:

```
register → login → create trip → request seat → approve/reject → complete trip → rate participants
```

---

# Table of Contents

1. Introduction  
2. API Conventions  
3. Authentication Endpoints  
4. Profile Endpoints  
5. Trip Endpoints  
6. Trip Request Endpoints  
7. Rating Endpoints  
8. Business Rules Reflected in the API  
9. HTTP Status Codes  
10. Summary  

---

# 1. Introduction

This document defines the **REST API specification** for UniRide.

It describes:

- endpoint paths
- HTTP methods
- authentication requirements
- request payloads
- response structure
- expected behavior

The API is designed for the **UniRide MVP** and will be implemented using:

- **Go**
- **Gin**
- **PostgreSQL**

---

# 2. API Conventions

## Base Path

All endpoints are exposed under:

```
/api/v1
```

---

## Data Format

- Requests and responses use **JSON**
- Timestamps use **ISO 8601 format**
- Standard **HTTP status codes** are used

---

## Authentication

Protected endpoints require **JWT authentication**.

The token must be sent in the request header:

```
Authorization: Bearer <token>
```

---

## Common Response Format

### Successful Response

```json
{
  "data": {}
}
```

### Error Response

```json
{
  "error": {
    "code": "string_code",
    "message": "Human-readable message"
  }
}
```

---

# 3. Authentication Endpoints

## Register User

**Endpoint**

```
POST /api/v1/auth/register
```

**Authentication Required**

No

### Request

```json
{
  "email": "student@example.com",
  "password": "securePassword123",
  "full_name": "John Doe",
  "university": "University of León",
  "phone_number": "+34 600000000"
}
```

### Response

**201 Created**

```json
{
  "data": {
    "user": {
      "id": 1,
      "email": "student@example.com",
      "role": "student"
    },
    "profile": {
      "full_name": "John Doe",
      "university": "University of León",
      "phone_number": "+34 600000000"
    }
  }
}
```

---

## Login User

**Endpoint**

```
POST /api/v1/auth/login
```

### Request

```json
{
  "email": "student@example.com",
  "password": "securePassword123"
}
```

### Response

**200 OK**

```json
{
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "email": "student@example.com",
      "role": "student"
    }
  }
}
```

---

# 4. Profile Endpoints

## Get Current User

```
GET /api/v1/users/me
```

Authentication: **Required**

### Response

```json
{
  "data": {
    "id": 1,
    "email": "student@example.com",
    "role": "student",
    "profile": {
      "full_name": "John Doe",
      "university": "University of León",
      "phone_number": "+34 600000000",
      "avatar_url": null,
      "bio": null,
      "rating_average": 4.5
    }
  }
}
```

---

## Update Profile

```
PUT /api/v1/users/me
```

### Request

```json
{
  "full_name": "John Doe",
  "university": "University of León",
  "phone_number": "+34 600000000",
  "avatar_url": "https://example.com/avatar.jpg",
  "bio": "Computer Science student"
}
```

### Response

```json
{
  "data": {
    "message": "Profile updated successfully"
  }
}
```

---

# 5. Trip Endpoints

## Create Trip / Ride

```
POST /api/rides
```

Authentication: **Required**

### Request

```json
{
  "origin": "León city center",
  "destination": "University campus",
  "departureDate": "2026-03-25T08:30:00Z",
  "availableSeats": 3,
  "price": 2.50
}
```

`POST /rides` is also available as a root-level alias.

### Response

**201 Created**

```json
{
  "message": "ride created successfully",
  "ride": {
    "id": 10,
    "driverId": 1,
    "origin": "León city center",
    "destination": "University campus",
    "departureDate": "2026-03-25T08:30:00Z",
    "availableSeats": 3,
    "price": 2.50,
    "status": "open"
  }
}
```

---

## List Trips / Rides

```
GET /api/rides
```

### Query Parameters

All query parameters are optional and can be combined. Empty parameters are ignored.

| Parameter | Description |
|-----------|-------------|
| origin | Case-insensitive partial match by origin |
| destination | Case-insensitive partial match by destination |
| departureDate | Exact calendar date in `YYYY-MM-DD` format |
| availableSeats | Minimum required available seats |

Example:

```
GET /api/rides?origin=León&destination=Campus&departureDate=2026-03-25&availableSeats=2
```

`GET /rides` is also available as a root-level alias.

### Response

```json
{
  "rides": [
    {
      "id": 10,
      "driverId": 1,
      "origin": "León city center",
      "destination": "University campus",
      "departureDate": "2026-03-25T08:30:00Z",
      "availableSeats": 2,
      "price": 2.50,
      "status": "open"
    }
  ]
}
```

---

## Get Trip Details

```
GET /api/v1/trips/{tripId}
```

### Response

```json
{
  "data": {
    "id": 10,
    "driver": {
      "id": 1,
      "full_name": "John Doe",
      "rating_average": 4.5
    },
    "origin": "León city center",
    "destination": "University campus",
    "departure_at": "2026-03-25T08:30:00Z",
    "total_seats": 3,
    "available_seats": 2,
    "price_per_seat": 2.50,
    "status": "open",
    "notes": "Leaving from downtown parking area"
  }
}
```

---

## Update Trip

```
PUT /api/v1/trips/{tripId}
```

Driver only.

```json
{
  "origin": "León city center",
  "destination": "University campus",
  "departure_at": "2026-03-25T09:00:00Z",
  "total_seats": 3,
  "price_per_seat": 2.50,
  "notes": "Updated departure time"
}
```

---

## Cancel Trip

```
PATCH /api/v1/trips/{tripId}/cancel
```

Driver only.

---

## Complete Trip

```
PATCH /api/v1/trips/{tripId}/complete
```

Driver only.

---

## List My Created Trips

```
GET /api/v1/trips/me/created
```

---

## List My Joined Trips

```
GET /api/v1/trips/me/joined
```

---

# 6. Trip Request Endpoints

## List My Bookings

```
GET /me/bookings
```

Authentication: **Required**

`GET /api/me/bookings` is also available for frontend API calls.

### Response

```json
{
  "bookings": [
    {
      "id": 1,
      "seatsReserved": 2,
      "status": "confirmed",
      "createdAt": "2026-05-01T10:00:00Z",
      "ride": {
        "id": 10,
        "route": "Madrid → Barcelona",
        "origin": "Madrid",
        "destination": "Barcelona",
        "date": "2026-05-20T10:00:00Z",
        "price": 15,
        "status": "open"
      }
    }
  ]
}
```

The endpoint always uses the authenticated user from the JWT and never accepts a user id in query or body.

## Create Trip Request

```
POST /api/v1/trips/{tripId}/requests
```

### Request

```json
{
  "message": "Hi, I would like to join this trip."
}
```

---

## List Trip Requests

```
GET /api/v1/trips/{tripId}/requests
```

Driver only.

---

## Approve Request

```
PATCH /api/v1/requests/{requestId}/approve
```

Driver only.

---

## Reject Request

```
PATCH /api/v1/requests/{requestId}/reject
```

Driver only.

---

## Cancel Request

```
PATCH /api/v1/requests/{requestId}/cancel
```

Passenger only.

---

# 7. Rating Endpoints

## Create Rating

```
POST /api/v1/trips/{tripId}/ratings
```

### Request

```json
{
  "reviewed_user_id": 2,
  "score": 5,
  "comment": "Very punctual and friendly."
}
```

---

## Get User Ratings

```
GET /api/v1/users/{userId}/ratings
```

---

# 8. Business Rules Reflected in the API

The API enforces the following rules:

- only authenticated users can create trips
- drivers cannot request seats in their own trips
- a user cannot submit multiple requests for the same trip
- requests can only be created for open trips
- only drivers can approve or reject requests
- available seats cannot become negative
- ratings only allowed after trip completion
- users cannot rate themselves
- users can only rate other participants of the same trip

---

# 9. HTTP Status Codes

### Success

| Code | Meaning |
|-----|--------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |

### Errors

| Code | Meaning |
|-----|--------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

# 10. Summary

The UniRide API is organized around four main areas:

- **Authentication**
- **User Profiles**
- **Trips and Requests**
- **Ratings**

This API specification defines the **contract between frontend and backend** and will guide the implementation of the **Go REST API using Gin**.

---

# Project Documentation Structure

```
/docs

architecture.md
domain-model.md
database-schema.md
api-spec.md
```
