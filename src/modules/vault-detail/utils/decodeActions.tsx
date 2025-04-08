import { ethers } from 'ethers';

import { actions } from '../VaultManagement/facets';

interface DecodedAction {
  facet: string;
  action: string;
  params: Record<string, unknown>;
}

export function decodeActions(encodedData: string): DecodedAction[] {
  try {
    // Get the function selector (first 4 bytes)
    const functionSelector = encodedData.slice(0, 10); // 0x + 4 bytes

    // Find the facet and action that matches this function selector
    for (const facet of actions) {
      for (const action of Object.values(facet.actions)) {
        const iface = new ethers.utils.Interface([action.abi]);
        const functionFragment = iface.getFunction(action.id);
        const selector = iface.getSighash(functionFragment);
        if (selector === functionSelector) {
          // Decode the function data
          const decodedData = iface.decodeFunctionData(action.id, encodedData);

          // Convert the decoded data to a params object
          const params: Record<string, unknown> = {};
          functionFragment.inputs.forEach((input, index) => {
            params[input.name] = decodedData[index];
          });

          return [
            {
              facet: facet.name,
              action: action.id,
              params,
            },
          ];
        }
      }
    }

    console.log(`No matching function found for selector ${functionSelector}`);
    return [];
  } catch (error) {
    console.error('Error decoding actions:', error);
    // throw error;
    return [];
  }
}
