let gpuDevicePromise: Promise<GPUDevice>;

const createGpuDevice = async () => {
  if (!navigator.gpu) {
    throw new Error("WebGPU is not supported in this browser.");
  }

  const adapter = await navigator.gpu.requestAdapter();

  if (!adapter) {
    throw new Error("No WebGPU adapter is available.");
  }

  const device = await adapter.requestDevice();

  device.lost.then(() => {
    throw new Error("WebGPU device lost");
  });

  return device;
};

export const getGpuDevice = () => {
  gpuDevicePromise ??= createGpuDevice();

  return gpuDevicePromise;
};
