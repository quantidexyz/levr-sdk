import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

// Note: TimeoutNaNWarning from HappyDOM is a known issue with React Query's garbage collection
// This warning doesn't affect test functionality and can be safely ignored
// See: https://github.com/capricorn86/happy-dom/issues/1324
