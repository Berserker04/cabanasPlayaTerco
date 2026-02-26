# API Specification — Cabañas Playa Terco

Base URL: `{API_URL}/api`

## Authentication

- Method: Laravel Sanctum (SPA cookies)
- CSRF: GET `/sanctum/csrf-cookie` before auth requests
- Google OAuth: Redirect flow

---

## Public Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Email registration |
| POST | `/auth/login` | Email login |
| POST | `/auth/logout` | Logout (auth) |
| GET | `/auth/google/redirect` | Google OAuth redirect |
| GET | `/auth/google/callback` | Google OAuth callback |
| GET | `/auth/user` | Current user profile (auth) |
| PUT | `/auth/profile` | Update profile (auth) |
| POST | `/auth/forgot-password` | Password reset request |
| POST | `/auth/reset-password` | Password reset |

### Cabins
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cabins` | List active cabin types |
| GET | `/cabins/{slug}` | Cabin type detail |

### Gallery
| Method | Endpoint | Params |
|--------|----------|--------|
| GET | `/gallery` | `?category=cabins\|nature\|experiences\|food\|guests` |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reviews` | Approved reviews (paginated) |
| GET | `/reviews/latest` | Latest 3 approved |
| POST | `/reviews` | Create review (auth, rate-limited) |

### Blog
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts` | Published posts (paginated) |
| GET | `/posts/{slug}` | Post detail |
| GET | `/categories` | Blog categories |
| GET | `/tags` | Blog tags |
| POST | `/posts/{id}/comments` | Add comment (auth) |

### Availability
| Method | Endpoint | Params |
|--------|----------|--------|
| GET | `/availability` | `?check_in=DATE&check_out=DATE&guests=INT` |
| GET | `/availability/calendar` | `?month=YYYY-MM&cabin_type_id=INT` |

### Contact
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/contact` | Submit contact/quote request |

---

## Admin Endpoints

All require `Authorization` + admin/staff role.

### Cabin Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/cabin-types` | List all cabin types |
| POST | `/admin/cabin-types` | Create cabin type |
| PUT | `/admin/cabin-types/{id}` | Update cabin type |
| DELETE | `/admin/cabin-types/{id}` | Delete cabin type |
| GET | `/admin/cabins` | List all cabin units |
| POST | `/admin/cabins` | Create cabin unit |
| PUT | `/admin/cabins/{id}` | Update cabin unit |
| DELETE | `/admin/cabins/{id}` | Delete cabin unit |
| POST | `/admin/cabin-media` | Upload cabin media |
| DELETE | `/admin/cabin-media/{id}` | Delete cabin media |
| GET | `/admin/amenities` | List amenities |
| POST | `/admin/amenities` | Create amenity |
| DELETE | `/admin/amenities/{id}` | Delete amenity |

### Reservations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/reservations` | List (filterable by date, cabin, status) |
| POST | `/admin/reservations` | Create reservation/block |
| PUT | `/admin/reservations/{id}` | Update reservation |
| DELETE | `/admin/reservations/{id}` | Cancel reservation |
| GET | `/admin/reservations/occupancy` | Occupancy report by month |

### Reviews Moderation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/reviews` | All reviews (any status) |
| PUT | `/admin/reviews/{id}` | Approve/reject + verify guest |
| DELETE | `/admin/reviews/{id}` | Delete review |

### Blog Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/posts` | All posts (any status) |
| POST | `/admin/posts` | Create post |
| PUT | `/admin/posts/{id}` | Update post |
| DELETE | `/admin/posts/{id}` | Delete post |
| GET | `/admin/comments` | All comments for moderation |
| PUT | `/admin/comments/{id}` | Approve/reject comment |
| DELETE | `/admin/comments/{id}` | Delete comment |

### Guest Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/guest-groups` | List groups |
| POST | `/admin/guest-groups` | Create group (titular) |
| GET | `/admin/guest-groups/{id}` | Group detail with members |
| PUT | `/admin/guest-groups/{id}` | Update group |
| POST | `/admin/guest-groups/{id}/members` | Add member |
| PUT | `/admin/guest-members/{id}` | Update member |
| DELETE | `/admin/guest-members/{id}` | Remove member |
| POST | `/admin/guest-groups/{id}/documents` | Upload document |
| GET | `/admin/guest-groups/export` | Export to Excel/PDF |

### Payments (Income)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/payments` | List payments |
| POST | `/admin/payments` | Record payment |
| PUT | `/admin/payments/{id}` | Update payment |
| GET | `/admin/payments/summary` | Monthly summary |

### Staff
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/staff` | List staff |
| POST | `/admin/staff` | Create staff member |
| PUT | `/admin/staff/{id}` | Update staff |
| DELETE | `/admin/staff/{id}` | Deactivate staff |
| POST | `/admin/staff/{id}/payments` | Record staff payment |
| GET | `/admin/staff/{id}/payments` | Staff payment history |
| GET | `/admin/staff-payments/summary` | Monthly cost summary |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard/stats` | All KPIs |

Returns:
```json
{
  "tourists_by_month": [],
  "occupancy_by_month": [],
  "avg_group_size": 0,
  "income_by_month": [],
  "staff_costs_by_month": [],
  "pending_reviews": 0,
  "unanswered_leads": 0
}
```

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/leads` | List leads (filterable) |
| PUT | `/admin/leads/{id}` | Update lead status |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List users |
| PUT | `/admin/users/{id}` | Update user role/status |

### Gallery Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/gallery` | All gallery items |
| POST | `/admin/gallery` | Upload gallery item |
| PUT | `/admin/gallery/{id}` | Update gallery item |
| DELETE | `/admin/gallery/{id}` | Delete gallery item |

---

## Response Format

### Success
```json
{
  "data": {},
  "message": "Success",
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 50
  }
}
```

### Error
```json
{
  "message": "Error description",
  "errors": {
    "field": ["Validation message"]
  }
}
```

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/login` | 5/minute |
| `/auth/register` | 3/minute |
| `/contact` | 3/hour per IP |
| `/reviews` (POST) | 1/30 days per user |
| General API | 60/minute |
| Admin API | 120/minute |
