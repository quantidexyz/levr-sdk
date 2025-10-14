# useSetClankerToken

Automatically set the global Clanker token context when the token address changes.

## Usage

```typescript
import { useSetClankerToken } from 'levr-sdk/client'

function ProjectPage({ clankerToken }: { clankerToken: `0x${string}` }) {
  // Automatically sets and updates when clankerToken prop changes
  useSetClankerToken(clankerToken)

  return <div>Project page content</div>
}
```

## Dynamic Token Switching

```typescript
import { useSetClankerToken, useProject } from 'levr-sdk/client'
import { useState } from 'react'

function TokenSwitcher({ tokens }: { tokens: Array<`0x${string}`> }) {
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(tokens[0])
  const { data: project } = useProject()

  // Automatically updates when selectedToken changes
  useSetClankerToken(selectedToken)

  return (
    <div>
      <h2>Current: {project?.token.name}</h2>
      <select
        value={selectedToken || ''}
        onChange={(e) => setSelectedToken(e.target.value as `0x${string}`)}
      >
        {tokens.map((address) => (
          <option key={address} value={address}>{address}</option>
        ))}
      </select>
    </div>
  )
}
```

## Parameters

- `clankerToken` (required): Token address to set, or null to clear

## Notes

- Automatically updates the global token context when the parameter changes
- All queries (project, user, pool, proposals) automatically refetch when token changes
- No need for manual `useEffect` - the hook handles it internally
- Pass `null` to clear the current token
