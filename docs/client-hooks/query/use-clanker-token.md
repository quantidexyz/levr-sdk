# useClankerToken

Get Clanker token metadata (admin, image, etc.).

## Usage

```typescript
import { useClankerToken } from 'levr-sdk/client'

function TokenMetadata() {
  const { data: tokenData, isLoading } = useClankerToken()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <img src={tokenData?.imageUrl} alt={tokenData?.name} />
      <p>Admin: {tokenData?.admin}</p>
      <p>Description: {tokenData?.description}</p>
    </div>
  )
}
```
