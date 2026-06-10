The WebGPU device will be created as a module level singleton, stored as a promise type so we can check if initialisation is finished.

Components can then use suspense to display a loading state until the gpu device is ready;