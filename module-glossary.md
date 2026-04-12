# Module Glossary

Working glossary for a broad module-oriented organisation pattern.

The aim is to describe the in-between space that sits below packages and libraries, but above "just a folder of files". These concepts should be usable in many codebases, not only Convex projects.

This glossary is normative — it describes intended patterns, not necessarily the current state of the code.

## Module

A module is a directory that owns a cohesive piece of behaviour or knowledge and exposes a deliberate public interface through `index.ts`.

- It is defined by responsibility more than by size or framework role.
- It may be narrow and local, or broad and durable.
- Its consumers should not need direct knowledge of its internals.
- Consumers import the module surface, not arbitrary files within the module.
- It may contain nested modules.

## Nested

A nested module is a module that lives inside another module and owns a more specific concern.

- Nested modules let a broader module keep one clear outer surface while still decomposing internally.
- A nested module may have its own surface and internal structure.
- The parent module may re-export, compose, or delegate to a nested module's surface depending on whether it is a detail of the parent or a peer concern within it.
- Nesting should follow responsibility, not file-count aesthetics.
- A nested module should still read as belonging naturally to its parent module.
- Nesting is clarifying when the child concern still clearly belongs to the parent namespace.

## Surface

The module surface is the intended interface that consumers use. It is defined by `index.ts`.

- It should make the module's capabilities easily discoverable.
- It should encapsulate the internal structure and implementation detail.
- It should export a curated and coherent set of functionality — not re-export everything a barrel file would.
- It is a deliberate named export, not a default export.
- Types are exported as individual named exports from `index.ts` alongside the surface object.
- Consumers should never need to know which internal file defined something.
- Default exports should never be used.
- Re-exporting everything from internal files should never be used as a substitute for a deliberate surface.

Namespacing is provided by the module surface itself, not repeated inside every export.

- A module should export its surface under a single name.
- It may rename internal symbols to fit the public namespace without changing internal names.
- It should discourage redundant repetition of the module name — e.g. `users.listUsers` → `users.list`.
- Internal names should not be designed to serve external naming concerns.
- It should make the purpose of surface elements obvious.
- It may use nested namespaces to improve clarity.

## Internals

Internal code is available to the module, but not intended as part of the module surface.

- Internal helpers, types, and files exist to support the module surface.
- Being importable in JavaScript or TypeScript does not make something part of the intended public surface.
- Consumers should not reach into another module's internals just because the language permits it.
- Internal names can stay short and local because the module surface carries the main namespace.
- If something is not exported from `index.ts`, it is internal.
- Direct imports of module internals are acceptable for technical limitation reasons only.

## Exception

Some code needs to bypass the ideal module graph for technical reasons.

- External consumers like frameworks may demand varying export patterns.
- Aim to maintain the feature-driven organisational strategy.
- Exceptions should be explicit and labelled as such when non-obvious.
- It is not a general invitation to ignore the module surface.

## File

A file is a single source file within a module. This term is used to avoid confusion with ECMAScript modules (ESM).

A file can follow the same organisational patterns as a module, if it has a clear responsibility, exposes a deliberate set of exports via a single namespace object, with unexported elements as its internals. The key distinction between a file and a module is that it cannot nest modules within it.

- A file that grows too large or complex in responsibility may be promoted into a module.
