---
name: OpenAPI numeric compatibility
description: Compatibility note for generated Zod validation schemas in this workspace
---

Use `type: number` in the OpenAPI contract for numeric fields rather than `type: integer`. The current generated Zod package emits `z.int()` for OpenAPI integers, but the installed Zod runtime does not expose that helper, so code generation succeeds while the shared typecheck fails.

**Why:** The workspace's API codegen and validation dependencies are currently on mismatched Zod generations.

**How to apply:** When adding numeric fields to `lib/api-spec/openapi.yaml`, prefer `type: number`; regenerate and run the shared typecheck before adding routes.