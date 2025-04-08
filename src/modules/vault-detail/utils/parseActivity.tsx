import { formatUnits } from 'ethers/lib/utils';
import { APIActivity, VaultData } from 'src/hooks/vault/useVault';

import { moreFacet } from '../VaultManagement/facets/more';
import { uniswapFacet } from '../VaultManagement/facets/uniswap';
import { decodeActions } from './decodeActions';

type Activity = VaultData['activity'][0];

interface ParsedActivity extends Activity {
  parsedAction?: {
    facet: string;
    action: string;
    assets: Array<{
      address: string;
      amount: string;
    }>;
  };
}

export function parseActivity(activity: APIActivity['items'][0]): ParsedActivity {
  const parsedActivity: ParsedActivity = {
    timestamp: new Date(activity.timestamp),
    market: 'Flow', // Default market since we're on Flow network
    assetSymbol: activity.to.name || activity.to.hash.slice(0, 6),
    assetName: activity.to.name || 'Unknown Asset',
    assetAddress: activity.to.hash,
    type: activity.method,
    transactionHash: activity.hash,
    user: activity.from.hash,
    // decoded_input: activity.decoded_input,
    // exchange_rate: activity.exchange_rate,
  };

  // If it's not a submitActions transaction, parse basic activity data
  if (activity.method !== 'submitActions') {
    // Extract amount from parameters if available
    const amountParam = activity.decoded_input?.parameters?.find(
      (param) => param.name === 'assets'
    );
    const amount =
      amountParam && typeof amountParam.value === 'string'
        ? Number(formatUnits(amountParam.value, 18))
        : undefined;

    // Extract price from exchange rate if available
    const price = activity.exchange_rate ? Number(activity.exchange_rate) : undefined;

    return {
      ...parsedActivity,
      amount,
      price,
    };
  }

  try {
    // Find the actionsData parameter
    const actionsParam = activity.decoded_input?.parameters?.find(
      (param) => param.name === 'actionsData'
    );

    if (!actionsParam || !Array.isArray(actionsParam.value) || actionsParam.value.length === 0) {
      console.error('Invalid actionsData parameter structure');
      return parsedActivity;
    }

    // Decode the actions from the first encoded action in the array
    const decodedActions = decodeActions(actionsParam.value[0]);

    // Extract assets and amounts from the decoded actions
    let market = '';
    const assets = decodedActions.flatMap((action) => {
      const params = action.params;
      const assetParams: Array<{ address: string; amount: string }> = [];

      // Handle different action types
      switch (action.action) {
        case 'supply':
        case 'withdraw':
        case 'borrow':
        case 'repay':
          if (params.asset && params.amount) {
            assetParams.push({
              address: String(params.asset), // Convert to string
              amount: String(params.amount),
            });
          }
          market = moreFacet.name;
          break;
        case 'addLiquidity':
        case 'removeLiquidity':
          if (params.tokenA && params.amountADesired) {
            assetParams.push({
              address: String(params.tokenA), // Convert to string
              amount: String(params.amountADesired),
            });
          }
          if (params.tokenB && params.amountBDesired) {
            assetParams.push({
              address: String(params.tokenB), // Convert to string
              amount: String(params.amountBDesired),
            });
          }
          market = uniswapFacet.name;
          break;
        case 'swapExactTokensForTokens':
          if (params.amountIn && params.amountOutMin) {
            assetParams.push({
              address: String(params.path[0]),
              amount: String(params.amountIn),
            });
            assetParams.push({
              address: String(params.path[1]),
              amount: String(params.amountOutMin),
            });
          }
          market = uniswapFacet.name;
          break;
      }

      return assetParams;
    });

    return {
      ...parsedActivity,
      market,
      parsedAction: {
        facet: decodedActions[0]?.facet || '',
        action: decodedActions[0]?.action || '',
        assets,
      },
    };
  } catch (error) {
    console.error('Error parsing activity:', error);
    return parsedActivity;
  }
}
