# Architecture

## GPU Snapshot
The rendering code is responsible for rendering a snapshot of data passed to it, with no knowledge of application state.

Animations will be handled on the CPU, interpolating and serialising data to be sent to the GPU. This means that animation and scrubbing can be rendered with the same GPU pipelines.