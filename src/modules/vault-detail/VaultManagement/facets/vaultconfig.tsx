import { Box, TypographyProps, Typography } from "@mui/material";
import { ComputedReserveDataWithMarket } from "src/hooks/app-data-provider/useAppDataProvider";
import { DisplayType, Facet, InputType, TransactionInput } from "./types";
import { Address } from "src/components/Address";


export const vaultConfigFacet: Facet = {
  name: 'Vault Config',
  icon: '/MOREVault.svg',
  description: 'Vault Config is the configuration facet for the vault.',
  actions: [
    {
      id: 'addAvailableAsset',
      name: 'Add Available Asset',
      actionButtonText: 'Make Asset Available',
      description: 'Add an asset to the vault',
      abi: `function addAvailableAsset(address asset) external`,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getAmountForBundleDisplay: (inputs: TransactionInput, _reserves: ComputedReserveDataWithMarket[], props?: TypographyProps) => {
        const asset = inputs.asset as string;

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1, width: '100%' }}>
            <Typography variant="helperText">Asset:</Typography>
            <Address
              address={asset}
              link={'#'}
              {...props}
            />
          </Box>
        )
      },
      inputs: [
        {
          id: 'asset',
          name: 'Asset',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
        }
      ]
    }
  ]
}

