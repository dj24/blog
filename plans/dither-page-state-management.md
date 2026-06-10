# Dither Page State Management
Zustand will be used along with the redux middleware to provide reducer functions.

ts-pattern will be used to exhaustively match the discriminated union type of the dispatched action.

It provides the serialisable data like settings values, but not things like the canvas object or webgpu device

## Example Actions
 * File uploaded
 * Monochrome palette changed
 * Polychrome palette changed
 * Mode changed