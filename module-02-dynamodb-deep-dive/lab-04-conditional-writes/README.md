# Lab 2.4 — Conditional Writes & Optimistic Locking

> 🟢 **Free tier** — DynamoDB on-demand + Lambda only.

**Goal:** Use `ConditionExpression` to implement idempotent creates, atomic counters, and optimistic locking with version attributes. Watch a concurrent update get rejected — the right way.

## Concepts

### Why conditional writes matter

Without them, you have race conditions:

```python
# DON'T DO THIS
item = table.get_item(Key={"id": "x"})["Item"]
item["count"] = item["count"] + 1
table.put_item(Item=item)   # someone else might have written between read and put
```

DynamoDB conditional expressions let you **read-and-write atomically** by attaching a precondition to the write:

```python
table.update_item(
    Key={"id": "x"},
    UpdateExpression="SET #c = :new",
    ConditionExpression="#c = :old",     # only succeed if no one else changed it
    ExpressionAttributeNames={"#c": "count"},
    ExpressionAttributeValues={":new": 11, ":old": 10},
)
```

If the condition fails: `ConditionalCheckFailedException`. **No data was written.** The caller catches it and retries.

### Patterns you must know

#### 1. Idempotent create

```python
table.put_item(
    Item={"id": "x", ...},
    ConditionExpression="attribute_not_exists(id)",
)
```

If the item exists → fail. Used for "register user" or "create order" where double-submits should not duplicate.

#### 2. Atomic counter (no read needed)

```python
table.update_item(
    Key={"id": "x"},
    UpdateExpression="ADD view_count :inc",
    ExpressionAttributeValues={":inc": 1},
)
```

DynamoDB increments server-side. No race condition. **`ADD` is the atomic operator** — don't confuse it with `SET` (which would race).

#### 3. Optimistic locking with a version attribute

```python
# Read with current version
item = table.get_item(Key={"id": "x"})["Item"]
current_version = item["version"]

# Mutate locally...
item["status"] = "shipped"

# Conditional write -- only if version hasn't changed
table.update_item(
    Key={"id": "x"},
    UpdateExpression="SET #s = :s, version = :new_v",
    ConditionExpression="version = :old_v",
    ExpressionAttributeNames={"#s": "status"},
    ExpressionAttributeValues={
        ":s": "shipped",
        ":new_v": current_version + 1,
        ":old_v": current_version,
    },
)
```

If two clients try to update concurrently, one wins and the other gets `ConditionalCheckFailedException`. The loser refetches and retries.

#### 4. Conditional delete

```python
table.delete_item(
    Key={"id": "x"},
    ConditionExpression="attribute_exists(id) AND #s = :pending",
    ExpressionAttributeNames={"#s": "status"},
    ExpressionAttributeValues={":pending": "pending"},
)
```

Only deletes if the item exists *and* is in a deletable state.

### Operators in `ConditionExpression`

| Function | Use |
|---|---|
| `attribute_exists(attr)` | True if the attribute is present |
| `attribute_not_exists(attr)` | True if absent |
| `attribute_type(attr, :type)` | True if attribute is of given type (`S`, `N`, `B`, `BOOL`, `L`, `M`, `SS`, etc.) |
| `begins_with(attr, :prefix)` | String prefix |
| `contains(attr, :val)` | String contains substring, or list contains element, or set contains element |
| `size(attr)` | Returns size; useful with comparison: `size(items) < :max` |

### Combining conditions

`AND`, `OR`, `NOT`, `( )` all work:

```python
ConditionExpression="attribute_exists(id) AND (size(#items) < :max OR #flag = :true)"
```

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
  --stack-name dva-lab-02-04-conditional-writes `
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
  --stack-name dva-lab-02-04-conditional-writes \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### 2. Idempotent create

#### PowerShell

```powershell
$STACK = "dva-lab-02-04-conditional-writes"
$FN = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text

function Invoke-Op($payload) {
  aws lambda invoke --function-name $FN --payload $payload --cli-binary-format raw-in-base64-out r.json | Out-Null
  Get-Content r.json
  Write-Host ""
}

# First create — succeeds
Invoke-Op '{"op": "create_idempotent", "id": "p-001", "data": "first"}'

# Second create with same ID — fails with ConditionalCheckFailedException
Invoke-Op '{"op": "create_idempotent", "id": "p-001", "data": "second"}'
```

#### Bash

```bash
STACK="dva-lab-02-04-conditional-writes"
FN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionName`].OutputValue' --output text)

invoke() {
  aws lambda invoke --function-name "$FN" \
    --payload "$1" --cli-binary-format raw-in-base64-out /tmp/r.json > /dev/null
  cat /tmp/r.json | jq
  echo
}

# First create — succeeds
invoke '{"op": "create_idempotent", "id": "p-001", "data": "first"}'

# Second create with same ID — fails with ConditionalCheckFailedException
invoke '{"op": "create_idempotent", "id": "p-001", "data": "second"}'
```

### 3. Atomic counter

#### PowerShell

```powershell
1..5 | ForEach-Object -Parallel {
  aws lambda invoke --function-name $using:FN `
    --payload '{"op": "increment", "id": "p-001"}' `
    --cli-binary-format raw-in-base64-out "i$_.json" | Out-Null
} -ThrottleLimit 5

Invoke-Op '{"op": "get", "id": "p-001"}'
```

#### Bash

```bash
# Increment 5 times concurrently
for i in 1 2 3 4 5; do
  aws lambda invoke --function-name "$FN" \
    --payload '{"op": "increment", "id": "p-001"}' \
    --cli-binary-format raw-in-base64-out /tmp/i$i.json > /dev/null &
done
wait

# Final value should be exactly 5 (no lost updates)
invoke '{"op": "get", "id": "p-001"}'
```

### 4. Optimistic locking (race demo)

#### PowerShell

```powershell
Invoke-Op '{"op": "create_with_version", "id": "p-002"}'

# Simulate concurrent update — one will fail
aws lambda invoke --function-name $FN --payload '{"op": "race_update", "id": "p-002"}' --cli-binary-format raw-in-base64-out r.json
Get-Content r.json
```

#### Bash

```bash
# Set up an item
invoke '{"op": "create_with_version", "id": "p-002"}'

# Simulate two concurrent updates — one will fail
aws lambda invoke --function-name "$FN" \
  --payload '{"op": "race_update", "id": "p-002"}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json
cat /tmp/r.json | jq
```

The `race_update` operation reads the version, simulates a delay, and writes with the conditional check. Run it from two terminals simultaneously — one wins, one fails with `ConditionalCheckFailedException`.

## Exam gotchas

- **`PutItem` with no `ConditionExpression` is upsert.** Almost always not what you want.
- **`UpdateItem` creates if missing** unless you add `attribute_exists(<pk>)`.
- **`ADD` works for numbers and sets only.** For strings or maps, use `SET`.
- **`SET` is the most common `UpdateExpression` operator.** `SET attr1 = :v1, attr2 = :v2` updates multiple attributes.
- **`REMOVE attr`** removes an attribute entirely (different from setting it to null).
- **`DELETE` (in UpdateExpression)** removes elements from a Set type — not the same as deleting an item.
- **`ReturnValues`:** `NONE` (default), `ALL_OLD`, `UPDATED_OLD`, `ALL_NEW`, `UPDATED_NEW`. Useful for optimistic locking — `ALL_NEW` returns the post-update item.
- **Conditional check failures consume capacity.** `ConditionalCheckFailedException` consumes 1 WCU even though no write happened. Plan for this if you have high contention.
- **`ReturnValuesOnConditionCheckFailure="ALL_OLD"`** — when a conditional check fails, return the current item state. Useful for resolving conflicts in client logic.
- **In transactions (Lab 2.5),** `TransactWriteItems` with conditions either *all* succeed or none do — different from independent conditional writes.

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

> 🧹 **Run cleanup before the next lab** — Lab 2.5 (Transactions) deploys its own tables.
