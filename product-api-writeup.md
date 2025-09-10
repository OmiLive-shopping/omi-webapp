# Product Management API Specification

> Product management workflow for brands in the OMI Live platform

## Product CRUD Operations

### Create
- **Who**: Brands can add new products
- **Required Fields**: title, description, price, image, buy link
- **Process**: Form submission with validation

### Read
- **Display**: Products appear on brand profiles
- **Features**: Searchable and filterable product catalog
- **Access**: Public viewing for all users

### Update
- **Permissions**: Brands can edit their existing products at any time
- **Scope**: All product fields can be modified
- **Validation**: Same rules as creation apply

### Delete
- **Method**: Soft delete recommended to preserve historical data
- **Permissions**: Brand owners only
- **Impact**: Product removed from public view but data retained

## Approval Workflow

**MVP Approach**: 
- ✅ Auto-approve all products
- 🔍 Manual review for flagged items
- 📋 Admin dashboard for content moderation

---

## User Roles & Permissions

### Standard User
- View live streams
- Participate in chat
- Purchase products
- Basic profile management

### Brand User
**All Standard User permissions PLUS:**
- ✨ Create and manage products
- 📺 Host live streams
- 📊 Access brand analytics dashboard
- 🏪 Manage brand profile and settings

### Technical Implementation
- **RBAC**: Role-based access control system
- **Concept**: Brands are "elevated streamers" with product management capabilities
- **Future Roles**: 
  - Brand Admin (multiple users per brand)
  - Brand Viewer (read-only access)

---

## Role Management Process

### Admin Capabilities
**Current Approach**: Manual admin assignment of roles

**Admin Features**:
- ⬆️ Upgrade users to Brand status
- ⬇️ Downgrade/suspend Brand accounts
- 👥 View all user roles and permissions
- 🔧 Bulk role management tools

### Future Automation Options
- 📝 Brand application process with verification
- 🤖 Automatic role assignment based on criteria (verified business, eco-certifications)
- 🚀 Self-service brand onboarding with approval workflow

**Best Practice**: Keep manual initially for quality control, automate as platform scales.

---

## Product Creation Flow

### 1. Authentication
- ✅ Verify user has Brand role
- 🔐 JWT token validation
- 🚫 Reject unauthorized requests

### 2. Product Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| **Title** | String | ✅ | Max 100 characters |
| **Description** | Text | ✅ | Max 500 characters |
| **Price** | Decimal | ✅ | USD format, positive value |
| **Primary Image** | File | ✅ | Max 5MB, JPG/PNG only |
| **Additional Images** | Files | ❌ | Up to 4 images, same constraints |
| **Buy Link** | URL | ✅ | Valid URL format |
| **Category/Tags** | Array | ✅ | Required for discovery |
| **Eco-Certifications** | Array | ❌ | Optional badges |

### 3. Validation & Processing
> **Note**: Optional features - implement if development time allows

- 🖼️ Image optimization/compression
- 🛡️ Content moderation (inappropriate language/images)
- 💰 Price format validation
- 🔗 Link verification and testing

### 4. Display Logic
- **Brand Profile**: Products immediately appear
- **Live Streams**: Available for showcase during streams
- **Product Catalog**: Searchable and filterable
- **Real-time Updates**: Socket.IO for live product additions

---

## Technical Implementation

### Infrastructure Requirements
- **Image Storage**: AWS S3 or Cloudinary recommended
- **Database**: Indexed fields for search performance
- **CDN**: Fast image loading and global distribution
- **Audit Trail**: Track all product changes for compliance

### API Endpoints Structure
```
POST   /api/v1/products              # Create product
GET    /api/v1/products              # List products (with filters)
GET    /api/v1/products/:id          # Get specific product
PUT    /api/v1/products/:id          # Update product
DELETE /api/v1/products/:id          # Soft delete product
GET    /api/v1/brands/:id/products   # Get brand's products
```

### Database Schema Considerations
- **Products Table**: Core product information
- **Product Images Table**: Multiple images per product
- **Product Categories Table**: Hierarchical categorization
- **Audit Log Table**: Track changes for compliance
- **Soft Delete**: `deleted_at` timestamp field

---

## Development Priority

1. **High Priority**: Basic CRUD operations with authentication
2. **Medium Priority**: Image upload and optimization
3. **Low Priority**: Advanced content moderation and validation
4. **Future**: Automated approval workflows and advanced analytics