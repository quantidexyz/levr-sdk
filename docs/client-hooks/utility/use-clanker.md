# useClanker

Get the Clanker SDK instance for advanced usage.

## Usage

```typescript
import { useClanker } from 'levr-sdk/client'

function AdvancedComponent() {
  const clanker = useClanker()

  // Use Clanker SDK methods directly
  useEffect(() => {
    if (clanker) {
      // Do something with Clanker SDK
    }
  }, [clanker])

  return <div>Advanced component</div>
}
```
