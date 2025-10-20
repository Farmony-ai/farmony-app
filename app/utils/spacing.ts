const spacingBase = {
  // Base spacing units
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  '2XL': 48,
  '3XL': 64,
  '4XL': 96,
  '5XL': 128,
} as const;

type SpacingBase = typeof spacingBase;

const spacingAliases = Object.keys(spacingBase).reduce<Record<string, number>>(
  (acc, key) => {
    const value = spacingBase[key as keyof SpacingBase];
    acc[key.toLowerCase()] = value;
    return acc;
  },
  {},
);

export const SPACING = {
  ...spacingBase,
  ...spacingAliases,
} as const;

const borderRadiusBase = {
  NONE: 0,
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  '2XL': 24,
  FULL: 9999,
} as const;

type BorderRadiusBase = typeof borderRadiusBase;

const borderRadiusAliases = Object.keys(borderRadiusBase).reduce<Record<string, number>>(
  (acc, key) => {
    const value = borderRadiusBase[key as keyof BorderRadiusBase];
    acc[key.toLowerCase()] = value;
    return acc;
  },
  {},
);

export const BORDER_RADIUS = {
  ...borderRadiusBase,
  ...borderRadiusAliases,
} as const;

export const SHADOWS = {
  SM: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  MD: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  LG: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  XL: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
