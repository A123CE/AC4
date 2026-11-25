const FLAG_OFF = 'off';

const readFlag = (value) => value !== FLAG_OFF;

export const isSphereEnabled = () => readFlag(import.meta.env?.VITE_ENC_SPHERE);

export const isDeckV2Enabled = () => readFlag(import.meta.env?.VITE_ENC_DECK_V2);
export const isGraphChipV2Enabled = () => readFlag(import.meta.env?.VITE_ENC_GRAPH_CHIP_V2);

export const isGraphThemeEnabled = () => readFlag(import.meta.env?.VITE_ENC_GRAPH_THEME);