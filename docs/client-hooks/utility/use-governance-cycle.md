# useGovernanceCycle

Manage governance cycle selection for viewing proposals from different cycles.

## Usage

```typescript
import { useGovernanceCycle, useProposals } from 'levr-sdk/client'

function CycleSelector() {
  const { selectedCycleId, setSelectedCycleId } = useGovernanceCycle()
  const { data: proposalsData } = useProposals()

  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(BigInt(cycleId))
  }

  return (
    <div>
      <h2>Governance Proposals</h2>

      <label>
        Select Cycle:
        <input
          type="number"
          value={selectedCycleId?.toString() || '1'}
          onChange={(e) => handleCycleChange(e.target.value)}
          min="1"
        />
      </label>

      <p>Viewing Cycle: {selectedCycleId?.toString()}</p>
      <p>Proposals: {proposalsData?.proposals.length || 0}</p>

      {proposalsData?.proposals.map((proposal) => (
        <div key={proposal.id.toString()}>
          <p>#{proposal.id.toString()}: {proposal.description}</p>
        </div>
      ))}
    </div>
  )
}
```

## Returns

```typescript
{
  selectedCycleId: bigint | null    // Currently selected cycle ID
  setSelectedCycleId: (cycleId: bigint | null) => void  // Update selected cycle
}
```

## Behavior

- Default cycle is `1n` (user-facing cycle 1 = contract cycle 0)
- Changing `selectedCycleId` automatically refetches proposals for that cycle
- Set to `null` to reset to current cycle
- Proposals query uses this value to determine which cycle to fetch

## Example: Browse Historical Cycles

```typescript
import { useGovernanceCycle, useProposals, useProject } from 'levr-sdk/client'

function CycleHistory() {
  const { data: project } = useProject()
  const { selectedCycleId, setSelectedCycleId } = useGovernanceCycle()
  const { data: proposalsData } = useProposals()

  const currentCycle = project?.governanceStats?.currentCycleId || 1n
  const cycles = Array.from({ length: Number(currentCycle) }, (_, i) => BigInt(i + 1))

  return (
    <div>
      <h2>Cycle History</h2>

      <div>
        {cycles.map((cycleId) => (
          <button
            key={cycleId.toString()}
            onClick={() => setSelectedCycleId(cycleId)}
            disabled={selectedCycleId === cycleId}
          >
            Cycle {cycleId.toString()}
          </button>
        ))}
      </div>

      <h3>Cycle {selectedCycleId?.toString()} Proposals</h3>
      {proposalsData?.winner && (
        <p>Winner: Proposal #{proposalsData.winner.toString()}</p>
      )}

      <ul>
        {proposalsData?.proposals.map((p) => (
          <li key={p.id.toString()}>{p.description}</li>
        ))}
      </ul>
    </div>
  )
}
```

## Notes

- Cycle selection is managed in LevrProvider state
- Affects `useProposals()` query automatically
- User-facing cycles start at 1 (contract cycles start at 0)
- Setting cycle to null uses current cycle from `project.governanceStats.currentCycleId`
- State persists across component re-renders within same LevrProvider

## Related

- [useProposals](../query/use-proposals.md) - Fetch proposals for selected cycle
- [useProject](../query/use-project.md) - Get current cycle ID
