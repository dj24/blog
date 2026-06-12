import tinycolor from "tinycolor2";

export type PaletteColor = readonly [red: number, green: number, blue: number];

const toHexChannel = (value: number) => {
  return value.toString(16).padStart(2, "0");
};

export const toHexColor = ([red, green, blue]: PaletteColor) => {
  return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
};

export const toRgbColor = (value: string): PaletteColor => {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
};

export const saturatePaletteColor = (
  [red, green, blue]: PaletteColor,
  amount: number,
): PaletteColor => {
  const saturatedColor = tinycolor({ r: red, g: green, b: blue }).saturate(amount).toRgb();

  return [saturatedColor.r, saturatedColor.g, saturatedColor.b];
};
