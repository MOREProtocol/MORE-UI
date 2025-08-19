export const VAULT_ID_TO_NAME = {
  '0xc52e820d2d6207d18667a97e2c6ac22eb26e803c': 'Tau Labs USDF Vault',
  '0xdb822963f9d0c4d62e20a06977be0b9ca6cafe62': 'Safe Yields WFLOW Vault',
};

export const VAULT_ID_TO_CURATOR_INFO = {
  '0xc52e820d2d6207d18667a97e2c6ac22eb26e803c': { logo: '/icons/curators/tau.svg', name: 'Tau Labs' },
  '0x4b38f1a344226a76f1be466fdcc42be8a2562357': { logo: '/icons/curators/tau.svg', name: 'Tau Labs' },
  '0xdb822963f9d0c4d62e20a06977be0b9ca6cafe62': { logo: '/icons/curators/safeyields.svg', name: 'Safe Yields' },
  '0xcbf9a7753f9d2d0e8141ebb36d99f87acef98597': { logo: '/icons/curators/safeyields.svg', name: 'Safe Yields' },
}

export const VAULT_ID_TO_MARKDOWN_DESCRIPTION = {
  '0xcbf9a7753f9d2d0e8141ebb36d99f87acef98597': `
## 📈 ankrFLOW Looping Strategy
Welcome to the most efficient way to earn yield on Flow across all of DeFi.
Our looping vault leverages ankrFLOW's native staking rewards and amplified exposure through More Markets' E-Mode, combining them into a single auto-managed strategy.
### ⏳ Time-Based Growth
Due to the way ankrFLOW works, its value (relative to FLOW) updates via an oracle once a week. This means your vault shares may appear flat for a few days—but stick around! The yield reflects as the oracle price updates, and performance compounds week by week.
### ⚠️ Short-Term Withdrawals
Opening and closing positions incurs small market execution fees. These are typically recovered over time, but if you withdraw too soon (e.g. under one week), you might see a slight dip in value. This isn't a bug—it's just timing.
### 💡 Best Practice
To benefit fully from this strategy:
• Consider holding your position for at least 7 days.
• Track your vault shares week over week to see growth align with oracle updates.
This vault is designed for sustainable compounding, not short-term flipping.
![SY chart](/images/sydescriptionchart.png)`,
}