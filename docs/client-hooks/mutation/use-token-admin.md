# useTokenAdmin

Token admin operations for updating metadata, image, and transferring admin rights.

## Usage

```typescript
import { useTokenAdmin } from 'levr-sdk/client'

function TokenAdminPanel() {
  const { updateMetadata, updateImage, updateAdmin } = useTokenAdmin({
    onUpdateMetadataSuccess: (txHash) => {
      console.log('Metadata updated!', txHash)
    },
    onUpdateMetadataError: (error) => {
      console.error('Failed to update metadata:', error)
    },
    onUpdateImageSuccess: (txHash) => {
      console.log('Image updated!', txHash)
    },
    onUpdateImageError: (error) => {
      console.error('Failed to update image:', error)
    },
    onUpdateAdminSuccess: (txHash) => {
      console.log('Admin transferred!', txHash)
    },
    onUpdateAdminError: (error) => {
      console.error('Failed to transfer admin:', error)
    },
  })

  const handleUpdateMetadata = () => {
    updateMetadata.mutate({
      clankerToken: '0x...',
      metadata: JSON.stringify({ description: 'Updated description' }),
    })
  }

  const handleUpdateImage = () => {
    updateImage.mutate({
      clankerToken: '0x...',
      imageUrl: 'https://example.com/new-image.png',
    })
  }

  const handleTransferAdmin = () => {
    updateAdmin.mutate({
      clankerToken: '0x...',
      newAdmin: '0x...',
    })
  }

  return (
    <div>
      <button
        onClick={handleUpdateMetadata}
        disabled={updateMetadata.isPending}
      >
        Update Metadata
      </button>
      <button
        onClick={handleUpdateImage}
        disabled={updateImage.isPending}
      >
        Update Image
      </button>
      <button
        onClick={handleTransferAdmin}
        disabled={updateAdmin.isPending}
      >
        Transfer Admin
      </button>
    </div>
  )
}
```

## Options

All callback parameters are optional:

- `onUpdateMetadataSuccess`: Callback with transaction hash after successful metadata update
- `onUpdateMetadataError`: Callback with error if metadata update fails
- `onUpdateImageSuccess`: Callback with transaction hash after successful image update
- `onUpdateImageError`: Callback with error if image update fails
- `onUpdateAdminSuccess`: Callback with transaction hash after successful admin transfer
- `onUpdateAdminError`: Callback with error if admin transfer fails

## Mutations

### `updateMetadata.mutate(params)`

Update the token's metadata string.

```typescript
updateMetadata.mutate({
  clankerToken: '0x...', // Token address
  metadata: '...', // New metadata string (typically JSON)
})
```

### `updateImage.mutate(params)`

Update the token's image URL.

```typescript
updateImage.mutate({
  clankerToken: '0x...', // Token address
  imageUrl: 'https://...', // New image URL
})
```

### `updateAdmin.mutate(params)`

Transfer token admin to a new address.

```typescript
updateAdmin.mutate({
  clankerToken: '0x...', // Token address
  newAdmin: '0x...', // New admin address
})
```

## Notes

- All operations require the connected wallet to be the current token admin
- After each mutation, the project query is automatically invalidated to refresh data
- Each mutation is independent and can be called separately
