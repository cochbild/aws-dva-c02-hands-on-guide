# Lab 2.5 — Transactions

> 🟢 **Free tier** — DynamoDB on-demand + Lambda only.

**Goal:** Use `TransactWriteItems` to update multiple items atomically. Trigger a transaction conflict and observe the failure mode.

## Concepts

### What transactions guarantee

ACID across **up to 100 items** in **multiple tables** in the same region:

- **Atomicity:** all writes succeed or none do
- **Consistency:** post-image satisfies all conditions
- **Isolation:** other readers see either pre- or post-image, not partial
- **Durability:** standard DynamoDB durability

### Cost (memorize this)

Transactional reads and writes are **2x normal cost**:

| Operation | Cost |
|---|---|
| Single `GetItem` | 1 RCU per 4 KB (eventually consistent: 0.5 RCU) |
| Single `TransactGet` | **2 RCU** per 4 KB |
| Single `PutItem` | 1 WCU per 1 KB |
| Single `TransactWrite` | **2 WCU** per 1 KB |

The 2x is because DynamoDB does the transaction in two phases (prepare + commit).

### Limits

- **Up to 100 items** in a single transaction (was 25 before 2022)
- **4 MB total data** per transaction
- All items must be in the **same AWS region**
- All items must be in the **same AWS account**

### Operation types in `TransactWriteItems`

Each item in the list is one of:

| Type | Use |
|---|---|
| `Put` | Insert/overwrite an item, optional condition |
| `Update` | Modify an item, optional condition |
| `Delete` | Remove an item, optional condition |
| `ConditionCheck` | **No write** — just check a condition. Use to "guard" the transaction on another item's state |

`ConditionCheck` is the powerful one. Example: "transfer $100 from A to B, but only if A is not frozen". The freeze check is a `ConditionCheck` on a third item.

### Failure modes

A transaction fails if:
- Any condition fails
- Any item is concurrently modified mid-transaction (another writer's update conflicts)
- Capacity is exceeded
- An item is targeted twice in the same transaction (you can't update the same item twice in one tx)

When it fails: `TransactionCanceledException`. The exception's `CancellationReasons` array tells you which item failed and why. Parse this in code to give meaningful errors.

### When to use transactions vs alternatives

| Need | Use |
|---|---|
| Update one item atomically | `UpdateItem` (it's already atomic) |
| Update multiple items as one unit | `TransactWriteItems` |
| Increment a counter | `UpdateItem` with `ADD` |
| Check-then-write on one item | `UpdateItem` with `ConditionExpression` |
| Lock something (pessimistic) | DynamoDB doesn't support pessimistic locks; use a "lock" item with TTL + transactions |
| Bulk insert without atomicity | `BatchWriteItem` (cheaper, 25 items max) |

### `BatchWriteItem` vs `TransactWriteItems`

| | BatchWriteItem | TransactWriteItems |
|---|---|---|
| Atomic? | **No** — partial success possible | Yes |
| Item limit | 25 | 100 |
| Operations | Put, Delete | Put, Update, Delete, ConditionCheck |
| Cost | Normal | 2x |
| Conditions? | No | Yes (per item) |

Batch is for "fire and forget" bulk operations where some failures are okay (you can retry the failed ones via `UnprocessedItems`). Transactions are for "all-or-nothing".

## Steps

### 1. Deploy

The template uses `CodeUri: src/`, so we `package` (upload code to S3) before `deploy`.

#### PowerShell

```powershell
$ACCOUNT = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-02-05-transactions `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

#### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT}-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-02-05-transactions \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### 2. Set up accounts

We model a payment scenario:
- `accounts` table — `account_id`, `balance`
- `transfers` table — log of attempted transfers

#### PowerShell

```powershell
$STACK = "dva-lab-02-05-transactions"
$FN = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text

function Invoke-Op($payload) {
  aws lambda invoke --function-name $FN --payload $payload --cli-binary-format raw-in-base64-out r.json | Out-Null
  Get-Content r.json
  Write-Host ""
}

Invoke-Op '{"op": "init", "accounts": [{"id": "A", "balance": 1000}, {"id": "B", "balance": 500}]}'
```

#### Bash

```bash
STACK="dva-lab-02-05-transactions"
FN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionName`].OutputValue' --output text)

invoke() {
  aws lambda invoke --function-name "$FN" \
    --payload "$1" --cli-binary-format raw-in-base64-out /tmp/r.json > /dev/null
  cat /tmp/r.json | jq
  echo
}

# Create accounts
invoke '{"op": "init", "accounts": [{"id": "A", "balance": 1000}, {"id": "B", "balance": 500}]}'
```

### 3. Successful transfer

**PowerShell:**

```powershell
Invoke-Op '{"op": "transfer", "from": "A", "to": "B", "amount": 100, "transfer_id": "tx-001"}'
Invoke-Op '{"op": "get", "id": "A"}'   # 900
Invoke-Op '{"op": "get", "id": "B"}'   # 600
```

**Bash:**

```bash
invoke '{"op": "transfer", "from": "A", "to": "B", "amount": 100, "transfer_id": "tx-001"}'
invoke '{"op": "get", "id": "A"}'   # 900
invoke '{"op": "get", "id": "B"}'   # 600
```

The transaction:
1. Decrements A's balance, condition: `balance >= amount`
2. Increments B's balance
3. Inserts the transfer log, condition: `attribute_not_exists(transfer_id)` (idempotent)

All three or none.

### 4. Idempotent retry

Same `transfer_id` again → fails because the log already exists.

**PowerShell:**

```powershell
Invoke-Op '{"op": "transfer", "from": "A", "to": "B", "amount": 100, "transfer_id": "tx-001"}'
# TransactionCanceledException, balances unchanged
```

**Bash:**

```bash
invoke '{"op": "transfer", "from": "A", "to": "B", "amount": 100, "transfer_id": "tx-001"}'
# TransactionCanceledException, balances unchanged
```

### 5. Insufficient funds

**PowerShell:**

```powershell
Invoke-Op '{"op": "transfer", "from": "B", "to": "A", "amount": 9999, "transfer_id": "tx-002"}'
# TransactionCanceledException — the balance condition failed; no balance changed
```

**Bash:**

```bash
invoke '{"op": "transfer", "from": "B", "to": "A", "amount": 9999, "transfer_id": "tx-002"}'
# TransactionCanceledException -- the balance condition failed; no balance changed
```

### 6. Inspect cancellation reasons

The function returns the per-item cancellation reasons:

```json
{
  "error_code": "TransactionCanceledException",
  "cancellation_reasons": [
    {"Code": "ConditionalCheckFailed", "Message": "..."},
    {"Code": "None"},
    {"Code": "None"}
  ]
}
```

The `Code` for each item tells you which one failed. `None` means that item would have succeeded.

## Exam gotchas

- **Transactions cost 2x normal.** Don't use them for everything.
- **Up to 100 items, 4 MB total.**
- **Same region, same account.** No cross-region transactions.
- **An item can only appear once per transaction.** No `Put` and `Delete` of the same key.
- **`TransactionCanceledException` is the failure code** — not `ConditionalCheckFailedException`. The cancellation reasons array tells you which item failed.
- **Idempotent retry token:** `ClientRequestToken` (in the API call) makes a transaction idempotent for ~10 minutes. If you retry with the same token, DynamoDB doesn't re-execute.
- **No global indexes affected on transactional read** — `TransactGetItems` reads only base tables, not GSIs.
- **DynamoDB Streams capture transactional changes** as separate events per item, in transaction order. Other consumers see the items appear "together-ish" but not strictly atomically.

## Cleanup

**PowerShell:**
```powershell
.\cleanup.ps1
```

**Bash:**
```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before the next lab** — Lab 2.6 (Streams) deploys its own table.
