// The package surface is intentionally tiny.
// We can widen it later once the internal layering settles, but for now the
// standalone library should lead with one clear way to use it.
export { Client, type ClientConfig } from './client/client'
