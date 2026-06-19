# dotLottie And Validation

## Two Related Formats

A raw Lottie animation is a single JSON object that describes one animation composition.

A dotLottie file is a ZIP archive that contains:

- `manifest.json`
- one or more animation JSON files under `animations/<id>.json`

In this codebase, we decompress `.lottie` archives and then validate the manifest plus each
contained animation JSON with the schemas in this folder.

## dotLottie Manifest

The dotLottie manifest is defined in [dotlottie.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/dotlottie.ts:1).

The manifest describes:

- the dotLottie manifest version
- optional author and generator metadata
- the list of packaged animations by id

Those animation ids map to files in the archive:

- `animations/main.json`
- `animations/hero.json`
- and so on

## Validation Strategy

These schemas are intentionally practical rather than exhaustive. They aim to:

- strongly model the parts of Lottie we already inspect and transform
- preserve unknown exporter-specific fields with `catchall(z.unknown())`
- keep the parser forward-compatible with real-world files

If we start depending on more parts of the format, this folder is the place to make those parts
explicit.
