# Module 2: Databases & Caching

DVA-C02 Domain 1 Task Statement 3 — *Use data stores in application development* — is the third-largest single block on the exam. This module gets you fluent in **every data store the exam covers**:

- **DynamoDB** (heaviest weight): keys, indexes, query vs scan, conditional writes, transactions, streams, capacity modes, TTL
- **RDS** (relational): MySQL `db.t3.micro`, parameter groups, snapshots, automated backups, read replicas
- **Aurora Serverless v2**: cluster vs instance endpoints, auto-pause, failover
- **ElastiCache Redis**: cache-aside, read-through, write-through, lazy loading, TTL strategies
- **MemoryDB Redis**: durability tradeoff vs ElastiCache, multi-AZ

## Exam blueprint mapping (Domain 1, TS3)

Every "knowledge of" / "skills in" bullet from the official guide is hit somewhere in this module:

| Blueprint bullet | Lab(s) |
|---|---|
| Relational and non-relational databases | 2.1, 2.8, 2.9 |
| CRUD operations | 2.1, 2.4, 2.8 |
| **High-cardinality partition keys** for balanced partition access | 2.1 |
| Cloud storage options (file/object/databases) | this module + Module 3 |
| **Database consistency models** (strongly vs eventually consistent) | 2.1, 2.2 |
| **Differences between query and scan operations** | 2.2 |
| **DynamoDB keys and indexing** | 2.1, 2.2, 2.3 |
| **Caching strategies** (write-through, read-through, lazy loading, TTL) | 2.10 |
| Ephemeral vs persistent data storage patterns | 2.10, 2.11 |
| Serializing/deserializing data to provide persistence | 2.1, 2.4 |
| Using, managing, and maintaining data stores | every lab |
| Managing data lifecycles | 2.7 (TTL), 2.8 (RDS snapshots) |
| Using data caching services | 2.10, 2.11 |

## Module shape — sequenced for resource sharing

This module uses a **shared-table** pattern for the DynamoDB labs. Lab 2.1 deploys one DynamoDB table; labs 2.2–2.5 reuse it (don't run cleanup between them). Lab 2.6 adds a Streams consumer to the same table. Lab 2.7 needs a fresh table because it changes capacity modes.

| # | Lab | Cost | Reuses prior? | What's deployed |
|---|---|---|---|---|
| 2.1 | [Table basics & high-cardinality keys](lab-01-table-basics/README.md) | 🟢 | n/a | Shared `dva-lab-02-shared` DDB table + Lambda |
| 2.2 | [Query vs scan, expressions, pagination](lab-02-query-vs-scan/README.md) | 🟢 | 🔁 reuses 2.1 table | Adds query/scan Lambdas |
| 2.3 | [GSI vs LSI, projection types](lab-03-indexes/README.md) | 🟢 | 🔁 reuses 2.1 table | Adds GSI consumer + small LSI demo table |
| 2.4 | [Conditional writes & optimistic locking](lab-04-conditional-writes/README.md) | 🟢 | 🔁 reuses 2.1 table | Adds conditional-write Lambdas |
| 2.5 | [Transactions](lab-05-transactions/README.md) | 🟢 | 🔁 reuses 2.1 table | Adds transaction Lambdas |
| 2.6 | [Streams + ESM](lab-06-streams-deeper/README.md) | 🟢 | 🔁 reuses 2.1 table | Adds Streams consumer Lambda |
| 2.7 | [TTL, capacity modes, PITR](lab-07-ttl-capacity/README.md) | 🟢 | 🧹 cleanup 2.1–2.6 first | Fresh table with provisioned capacity + TTL |
| 2.8 | [RDS MySQL](lab-08-rds-mysql/README.md) | 🟡 (free for 12mo) | 🧹 starts fresh | RDS db.t3.micro + Lambda-in-VPC client |
| 2.9 | [Aurora Serverless v2](lab-09-aurora-serverless/README.md) | 🔴 | 🧹 starts fresh | Aurora Serverless v2 cluster |
| 2.10 | [ElastiCache Redis + caching patterns](lab-10-elasticache-redis/README.md) | 🟡 | 🧹 starts fresh | ElastiCache cache.t3.micro + Lambda-in-VPC |
| 2.11 | [MemoryDB Redis](lab-11-memorydb/README.md) | 🔴 | 🧹 starts fresh | MemoryDB cluster |

## DynamoDB foundations (read once before Lab 2.1)

### The data model in 30 seconds

DynamoDB is a key-value + document store. Every table has a **primary key**:

- **Partition key** alone — items are unique by this single attribute
- **Composite key** = partition key + **sort key** — items are unique by the combination

The partition key determines which physical partition holds the item. Items with the same partition key are stored together, sorted by the sort key.

### Capacity model

- **Read Capacity Unit (RCU):** 1 strongly consistent read of up to 4 KB per second. Eventually consistent reads are 0.5 RCU per 4 KB. Transactional reads are 2 RCU per 4 KB.
- **Write Capacity Unit (WCU):** 1 write of up to 1 KB per second. Transactional writes are 2 WCU per 1 KB.

Always round up. A 5 KB item costs 2 WCU.

### Three consistency modes

- **Eventually consistent** (default for reads) — cheap, may return stale data for up to a second
- **Strongly consistent** — twice the RCU cost, always returns latest committed data
- **Transactional** — ACID across multiple items, twice the cost again

GSIs **only support eventually consistent reads** — never strongly consistent. Tested.

### Two billing modes

- **On-demand** (`PAY_PER_REQUEST`) — pay per request, no capacity planning. Good for unpredictable traffic, dev/test, brand-new apps.
- **Provisioned** — pay for reserved RCUs/WCUs per second. Cheaper at sustained load. Combine with auto-scaling.

You can switch between them, but **only once every 24 hours**. Tested.

### Single-table design (briefly)

In production, DynamoDB tables often pack multiple entity types (users, orders, line items) into one table using overloaded keys (e.g., `pk = USER#123, sk = USER#PROFILE` vs `pk = USER#123, sk = ORDER#456`). This module's shared table uses that pattern. The exam doesn't go that deep, but you'll see the pattern in real work.

## Get started

[Lab 2.1 — Table Basics & High-Cardinality Keys](lab-01-table-basics/README.md)
