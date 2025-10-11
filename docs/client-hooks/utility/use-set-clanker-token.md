# useSetClankerToken

Update the global Clanker token context.

## Usage

```typescript
import { useSetClankerToken } from 'levr-sdk/client'

function TokenSwitcher() {
  const setClankerToken = useSetClankerToken()

  return (
    <select onChange={(e) => setClankerToken(e.target.value as `0x${string}`)}>
      <option value="0x...">Token A</option>
      <option value="0x...">Token B</option>
    </select>
  )
}
```
