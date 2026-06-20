# Architecture

## GPU Snapshot
The rendering code is responsible for rendering a snapshot of data passed to it, with no knowledge of the application state.

## CPU Flattening
Each frame, the lottie tree will be walked and flattened into one GPU struct.

This way the shader can apply all modifications to a shape in one pass

Interpolation will also happen as part of the flattening process, getting the current value of attributes based on their keyframes and the current frame being rendered.
