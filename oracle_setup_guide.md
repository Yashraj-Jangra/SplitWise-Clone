# Oracle Cloud Infrastructure (OCI) Setup & Provisioning Guide

This guide details how to set up **Oracle Cloud NoSQL Database (`SplitItDB`)** and **OCI Object Storage Bucket (`splitit-storage`)** under the Always Free Tier.

---

## 1. Oracle Cloud NoSQL Database Setup (`SplitItDB`)

### Step 1: Create Table in Oracle Console
1. Log into your **Oracle Cloud Infrastructure Console**.
2. Navigate to **Databases** -> **NoSQL Database** -> **Tables**.
3. Select your **Compartment** and click **Create Table**.
4. Enter Table Name: `SplitItDB`.
5. Select **Table Model**: `SQL / DDL`.
6. Paste the following DDL statement:

```sql
CREATE TABLE SplitItDB (
    pk STRING,
    sk STRING,
    entityType STRING,
    gsi1pk STRING,
    gsi1sk STRING,
    data JSON,
    createdAt TIMESTAMP(3),
    updatedAt TIMESTAMP(3),
    PRIMARY KEY(SHARD(pk), sk)
);
```

### Step 2: Set Capacity Limits (Always Free Tier)
- Select **Provisioned Capacity**.
- Read Capacity Units (RCU): `50`
- Write Capacity Units (WCU): `50`
- Disk Storage: `25 GB`

### Step 3: Create Secondary Indexes
Run the following SQL commands in the Oracle NoSQL Query Executer:

```sql
-- Global Secondary Index for email/token lookups
CREATE INDEX idx_gsi1 ON SplitItDB (gsi1pk, gsi1sk);

-- Index for entity filtering across partitions
CREATE INDEX idx_entityType ON SplitItDB (entityType);
```

---

## 2. OCI Object Storage Bucket Setup (`splitit-storage`)

1. Navigate to **Storage** -> **Buckets**.
2. Click **Create Bucket**.
3. Bucket Name: `splitit-storage`.
4. Storage Tier: `Standard` (Always Free 10 GB).
5. Enable **Emit Object Events** and keep visibility as `Private`.

### Generate Customer Secret Key for S3 Compatibility API
1. Open user profile icon (top right) -> **User Settings**.
2. Under **Resources** (bottom left), click **Customer Secret Keys**.
3. Click **Generate Secret Key** (Name: `SplitItStorageKey`).
4. Copy the generated **Secret Key** immediately (shown only once).
5. Copy the **Access Key ID** displayed in the table.

---

## 3. Application `.env.local` Configuration

Add the following environment variables to `.env.local`:

```env
# Oracle Cloud NoSQL Config
OCI_REGION=us-ashburn-1
OCI_COMPARTMENT_OCID=ocid1.compartment.oc1..your_compartment_ocid
OCI_NOSQL_TABLE=SplitItDB

# Oracle Cloud Object Storage Config (S3 Compatible)
OCI_NAMESPACE=your_tenancy_namespace
OCI_STORAGE_BUCKET=splitit-storage
OCI_STORAGE_ENDPOINT=https://your_tenancy_namespace.compat.objectstorage.us-ashburn-1.oraclecloud.com
OCI_S3_ACCESS_KEY=your_customer_access_key_id
OCI_S3_SECRET_KEY=your_customer_secret_key
```

---

## 4. Live Data Import Command

Once your Oracle Cloud NoSQL table `SplitItDB` is created, run the import command to upload all 2,258 records:

```bash
npx tsx scripts/import-oracle-nosql.ts --live
```
