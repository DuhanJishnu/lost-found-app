# Python API Architecture: The 4-Layer Pattern

A scalable, maintainable Python backend relies on strict **Separation of Concerns**. Data flows through distinct, isolated layers, ensuring components are highly testable, decoupled, and easy to refactor.

## The Request Pipeline

```text
HTTP Request (Frontend)
       ↓
[ 1. Router/View ]    ← HTTP boundaries & routing
       ↓
[ 2. Schemas ]        ← Data validation (Gatekeeper)
       ↓
[ 3. Service ]        ← Business logic (The Brain)
       ↓
[ 4. Repository ]     ← Database access (The Vault)
       ↓
PostgreSQL (DB)
```

## Directory Structure
```text
app/
├── api/             # Routers (endpoints)
├── schemas/         # Data validation models (e.g., Pydantic)
├── services/        # Core business logic
└── repositories/    # Database queries and transactions
```

---

## Layer Breakdown & Developer Rules

### 1. Router/View (`app/api/items.py`)
**Role:** The Traffic Cop.
*   **Do:** Route HTTP requests, inject dependencies, define status codes, and return responses.
*   **Don't:** Write business logic, compute data, or touch the database. 
*   **Knowledge Nugget:** Routers should be as thin as possible. If your endpoint function is longer than 10 lines, your business logic is leaking.

### 2. Schemas (`app/schemas/item.py`)
**Role:** The Bouncer.
*   **Do:** Use strict typing (e.g., Pydantic) to define expected input/output structures.
*   **Don't:** Perform database lookups or complex cross-field business validation.
*   **Knowledge Nugget:** Schemas protect your API by failing fast. An invalid payload (e.g., missing titles, wrong enum values) triggers a `422 Unprocessable Entity` instantly, saving server processing power.

### 3. Service (`app/services/item_service.py`)
**Role:** The Brain.
*   **Do:** Execute all business rules (e.g., triggering notifications, calling external APIs like Gemini, calculating matches). 
*   **Don't:** Parse HTTP payloads (`request.json()`) or write direct SQL/ORM commands (`db.execute()`).
*   **Knowledge Nugget:** This layer operates entirely on validated Python objects. Because it is ignorant of both the Web network and the Database, you can test 100% of your business logic using fast, isolated unit tests.
*   The service shouldn't contain SQL. Thus filtering also belong to repository.

### 4. Repository (`app/repositories/item_repository.py`)
**Role:** The Vault.
*   **Do:** Handle data persistence (CRUD operations, `add`, `commit`, `refresh`, complex SQL queries).
*   **Don't:** Know *why* data is being saved. Never put domain logic, email triggers, or Redis caching here.
*   **Knowledge Nugget:** The Repository pattern abstracts the database. If you switch from PostgreSQL to MongoDB, or from SQLAlchemy to SQLModel, you only rewrite this single folder. The rest of your app remains untouched.

## Important Things to Remember
The `*`

This is an important Python feature:

```
async def get_items(
    self,
    *,
    item_type: ItemType | None = None,
    category: str | None = None,
    ...
):
```
The `*` means:

Everything after `*` must be passed using its parameter name.


### Cloudflare R2 image upload — short summary

Think:

> **Frontend carries the image → Backend gives permission → R2 stores the image.**

**Upload flow:**

```text
User selects image
      ↓
Frontend
      ↓
POST /storage/upload-url
      ↓
FastAPI
      ↓
Creates temporary PUT URL
      ↓
Frontend receives:
  upload_url
  object_key
      ↓
Frontend PUTs actual image directly to R2
      ↓
R2 stores:
items/abc123.jpg
```

### What each thing does

* **Frontend:** Has the actual image and uploads it.
* **FastAPI:** Never receives the image. It creates a temporary **presigned URL**.
* **R2:** Actually stores the image.
* **Object key:** The image's name/address, e.g. `items/abc123.jpg`.
* **Database:** Stores the object key along with the Lost & Found item.

### Download flow

```text
Frontend asks for image
        ↓
FastAPI gets object_key from DB
        ↓
FastAPI creates temporary GET URL
        ↓
Frontend receives URL
        ↓
Frontend gets image directly from R2
```

### Remember this

> **Backend gives the key. Frontend carries the file. R2 keeps the file.**

And your R2 bucket stays **private**; presigned URLs provide temporary access when needed.
