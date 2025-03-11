export interface VaultAssetData {
  id: string;
  name: string;
  aum: number;
  flowValue: number;
  flowPrice: number;
  curator: string;
  netApy: number;
  depositDenomination: string;
  sharePrice: number;
  priceChange: number;
  priceHistory: { x: number; y: number }[];
}

export const mockVaultAssets: VaultAssetData[] = [
  {
    id: '1',
    name: 'Steakhouse FLOW',
    aum: 1000,
    flowValue: 1500,
    flowPrice: 24.65,
    curator: 'Steakhouse Financial',
    netApy: 4.5,
    depositDenomination: '$$$',
    sharePrice: 24.65,
    priceChange: 0.3,
    priceHistory: Array(50)
      .fill(0)
      .map((_, i) => ({
        x: i,
        y: 20 + Math.random() * 10 + Math.sin(i / 5) * 3,
      })),
  },
  {
    id: '2',
    name: 'Steakhouse FLOW',
    aum: 1000,
    flowValue: 1500,
    flowPrice: 24.65,
    curator: 'Steakhouse Financial',
    netApy: 4.5,
    depositDenomination: '$$$',
    sharePrice: 24.65,
    priceChange: 0.3,
    priceHistory: Array(50)
      .fill(0)
      .map((_, i) => ({
        x: i,
        y: 20 + Math.random() * 10 + Math.cos(i / 5) * 3,
      })),
  },
  {
    id: '3',
    name: 'Steakhouse FLOW',
    aum: 1000,
    flowValue: 1500,
    flowPrice: 24.65,
    curator: 'Steakhouse Financial',
    netApy: 4.5,
    depositDenomination: '$$$',
    sharePrice: 24.65,
    priceChange: 0.3,
    priceHistory: Array(50)
      .fill(0)
      .map((_, i) => ({
        x: i,
        y: 20 + Math.random() * 10 + Math.sin(i / 4) * 4,
      })),
  },
  {
    id: '4',
    name: 'Steakhouse FLOW',
    aum: 1000,
    flowValue: 1500,
    flowPrice: 24.65,
    curator: 'Steakhouse Financial',
    netApy: 4.5,
    depositDenomination: '$$$',
    sharePrice: 24.65,
    priceChange: 0.3,
    priceHistory: Array(50)
      .fill(0)
      .map((_, i) => ({
        x: i,
        y: 20 + Math.random() * 10 + Math.cos(i / 4) * 4,
      })),
  },
  {
    id: '5',
    name: 'Steakhouse FLOW',
    aum: 1000,
    flowValue: 1500,
    flowPrice: 24.65,
    curator: 'Steakhouse Financial',
    netApy: 4.5,
    depositDenomination: '$$$',
    sharePrice: 24.65,
    priceChange: 0.3,
    priceHistory: Array(50)
      .fill(0)
      .map((_, i) => ({
        x: i,
        y: 20 + Math.random() * 10 + Math.sin(i / 3) * 3,
      })),
  },
  {
    id: '6',
    name: 'Steakhouse FLOW',
    aum: 1000,
    flowValue: 1500,
    flowPrice: 24.65,
    curator: 'Steakhouse Financial',
    netApy: 4.5,
    depositDenomination: '$$$',
    sharePrice: 24.65,
    priceChange: 0.3,
    priceHistory: Array(50)
      .fill(0)
      .map((_, i) => ({
        x: i,
        y: 20 + Math.random() * 10 + Math.cos(i / 3) * 3,
      })),
  },
];
