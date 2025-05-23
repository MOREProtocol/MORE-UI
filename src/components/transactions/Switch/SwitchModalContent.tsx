import { normalize, normalizeBN } from '@aave/math-utils';
import { SwitchVerticalIcon } from '@heroicons/react/outline';
import { Box, CircularProgress, IconButton, SvgIcon, Typography } from '@mui/material';
import { debounce } from 'lodash';
import React, { useMemo, useState } from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { Row } from 'src/components/primitives/Row';
import { Warning } from 'src/components/primitives/Warning';
import { ConnectWalletButton } from 'src/components/WalletConnection/ConnectWalletButton';
import { TokenInfoWithBalance } from 'src/hooks/generic/useTokensBalance';
import { useParaswapSellRates } from 'src/hooks/paraswap/useParaswapRates';
import { useIsWrongNetwork } from 'src/hooks/useIsWrongNetwork';
import { useModalContext } from 'src/hooks/useModal';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { getNetworkConfig } from 'src/utils/marketsAndNetworksConfig';
import { GENERAL } from 'src/utils/mixPanelEvents';

import { TxModalDetails } from '../FlowCommons/TxModalDetails';
import { TxModalTitle } from '../FlowCommons/TxModalTitle';
import { ChangeNetworkWarning } from '../Warnings/ChangeNetworkWarning';
import { ParaswapErrorDisplay } from '../Warnings/ParaswapErrorDisplay';
import { SupportedNetworkWithChainId } from './common';
import { NetworkSelector } from './NetworkSelector';
import { SwitchActions } from './SwitchActions';
import { SwitchAssetInput } from './SwitchAssetInput';
import { SwitchErrors } from './SwitchErrors';
import { SwitchRates } from './SwitchRates';
import { SwitchSlippageSelector } from './SwitchSlippageSelector';
import { SwitchTxSuccessView } from './SwitchTxSuccessView';

interface SwitchModalContentProps {
  selectedChainId: number;
  setSelectedChainId: (value: number) => void;
  supportedNetworks: SupportedNetworkWithChainId[];
  tokens: TokenInfoWithBalance[];
  defaultInputToken: TokenInfoWithBalance;
  defaultOutputToken: TokenInfoWithBalance;
  addNewToken: (token: TokenInfoWithBalance) => Promise<void>;
}

export const SwitchModalContent = ({
  supportedNetworks,
  selectedChainId,
  setSelectedChainId,
  defaultInputToken,
  defaultOutputToken,
  tokens,
  addNewToken,
}: SwitchModalContentProps) => {
  const [slippage, setSlippage] = useState('0.001');
  const [inputAmount, setInputAmount] = useState('');
  const [debounceInputAmount, setDebounceInputAmount] = useState('');
  const { mainTxState: switchTxState, gasLimit, txError, setTxError } = useModalContext();
  const user = useRootStore((store) => store.account);

  const selectedNetworkConfig = getNetworkConfig(selectedChainId);

  const [selectedInputToken, setSelectedInputToken] = useState(defaultInputToken);
  const [selectedOutputToken, setSelectedOutputToken] = useState(defaultOutputToken);

  const { readOnlyModeAddress } = useWeb3Context();

  const isWrongNetwork = useIsWrongNetwork(selectedChainId);

  const handleInputChange = (value: string) => {
    setTxError(undefined);
    if (value === '-1') {
      setInputAmount(selectedInputToken.balance);
      debouncedInputChange(selectedInputToken.balance);
    } else {
      setInputAmount(value);
      debouncedInputChange(value);
    }
  };

  const debouncedInputChange = useMemo(() => {
    return debounce((value: string) => {
      setDebounceInputAmount(value);
    }, 300);
  }, [setDebounceInputAmount]);

  const {
    data: sellRates,
    error: ratesError,
    isFetching: ratesLoading,
  } = useParaswapSellRates({
    chainId: selectedNetworkConfig.underlyingChainId ?? selectedChainId,
    amount:
      debounceInputAmount === ''
        ? '0'
        : normalizeBN(debounceInputAmount, -1 * selectedInputToken.decimals).toFixed(0),
    srcToken: selectedInputToken.address,
    srcDecimals: selectedInputToken.decimals,
    destToken: selectedOutputToken.address,
    destDecimals: selectedOutputToken.decimals,
    user,
    options: {
      partner: 'more-widget',
    },
  });

  if (sellRates && switchTxState.success) {
    return (
      <SwitchTxSuccessView
        txHash={switchTxState.txHash}
        amount={debounceInputAmount}
        symbol={selectedInputToken.symbol}
        iconSymbol={selectedInputToken.symbol}
        iconUri={selectedInputToken.logoURI}
        outSymbol={selectedOutputToken.symbol}
        outIconSymbol={selectedOutputToken.symbol}
        outIconUri={selectedOutputToken.logoURI}
        outAmount={(
          Number(normalize(sellRates.destAmount, sellRates.destDecimals)) *
          (1 - Number(slippage))
        ).toString()}
      />
    );
  }

  const onSwitchReserves = () => {
    const fromToken = selectedInputToken;
    const toToken = selectedOutputToken;
    const toInput = sellRates
      ? normalizeBN(sellRates.destAmount, sellRates.destDecimals).toString()
      : '0';
    setSelectedInputToken(toToken);
    setSelectedOutputToken(fromToken);
    setInputAmount(toInput);
    setDebounceInputAmount(toInput);
    setTxError(undefined);
  };

  const handleSelectedInputToken = (token: TokenInfoWithBalance) => {
    if (!tokens.find((t) => t.address === token.address)) {
      addNewToken(token).then(() => {
        setSelectedInputToken(token);
        setTxError(undefined);
      });
    } else {
      setSelectedInputToken(token);
      setTxError(undefined);
    }
  };

  const handleSelectedOutputToken = (token: TokenInfoWithBalance) => {
    if (!tokens.find((t) => t.address === token.address)) {
      addNewToken(token).then(() => {
        setSelectedOutputToken(token);
        setTxError(undefined);
      });
    } else {
      setSelectedOutputToken(token);
      setTxError(undefined);
    }
  };

  const handleSelectedNetworkChange = (value: number) => {
    setTxError(undefined);
    setSelectedChainId(value);
  };

  return (
    <>
      <TxModalTitle title="Switch tokens" />
      {isWrongNetwork.isWrongNetwork && !readOnlyModeAddress && (
        <ChangeNetworkWarning
          networkName={selectedNetworkConfig.name}
          chainId={selectedChainId}
          event={{
            eventName: GENERAL.SWITCH_NETWORK,
          }}
        />
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <NetworkSelector
          networks={supportedNetworks}
          selectedNetwork={selectedChainId}
          setSelectedNetwork={handleSelectedNetworkChange}
        />
        <SwitchSlippageSelector slippage={slippage} setSlippage={setSlippage} />
      </Box>
      {!selectedInputToken || !selectedOutputToken ? (
        <CircularProgress />
      ) : (
        <>
          <Box
            sx={{
              display: 'flex',
              gap: '15px',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <SwitchAssetInput
              chainId={selectedChainId}
              assets={tokens.filter((token) => token.address !== selectedOutputToken.address)}
              value={inputAmount}
              onChange={handleInputChange}
              usdValue={sellRates?.srcUSD || '0'}
              onSelect={handleSelectedInputToken}
              selectedAsset={selectedInputToken}
            />
            <IconButton
              onClick={onSwitchReserves}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                position: 'absolute',
                backgroundColor: 'background.paper',
              }}
            >
              <SvgIcon sx={{ color: 'primary.main', fontSize: '18px' }}>
                <SwitchVerticalIcon />
              </SvgIcon>
            </IconButton>
            <SwitchAssetInput
              chainId={selectedChainId}
              assets={tokens.filter((token) => token.address !== selectedInputToken.address)}
              value={
                sellRates
                  ? normalizeBN(sellRates.destAmount, sellRates.destDecimals).toString()
                  : '0'
              }
              usdValue={sellRates?.destUSD || '0'}
              loading={
                debounceInputAmount !== '0' &&
                debounceInputAmount !== '' &&
                ratesLoading &&
                !ratesError
              }
              onSelect={handleSelectedOutputToken}
              disableInput={true}
              selectedAsset={selectedOutputToken}
            />
          </Box>
          {sellRates && (
            <>
              <SwitchRates
                rates={sellRates}
                srcSymbol={selectedInputToken.symbol}
                destSymbol={selectedOutputToken.symbol}
              />
            </>
          )}
          {sellRates && user && (
            <TxModalDetails gasLimit={gasLimit} chainId={selectedChainId}>
              <Row
                caption={`Minimum ${selectedOutputToken.symbol} received`}
                captionVariant="caption"
              >
                <FormattedNumber
                  compact={false}
                  roundDown={true}
                  variant="caption"
                  value={
                    Number(normalize(sellRates.destAmount, sellRates.destDecimals)) *
                    (1 - Number(slippage))
                  }
                />
              </Row>
              <Row sx={{ mt: 1 }} caption={'Minimum USD value received'} captionVariant="caption">
                <FormattedNumber
                  symbol="usd"
                  symbolsVariant="caption"
                  variant="caption"
                  value={Number(sellRates.destUSD) * (1 - Number(slippage))}
                />
              </Row>
            </TxModalDetails>
          )}
          {user ? (
            <>
              {(selectedInputToken.extensions?.isUserCustom ||
                selectedOutputToken.extensions?.isUserCustom) && (
                <Warning severity="warning" icon={false} sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="caption">
                    You have selected a custom imported token.
                  </Typography>
                </Warning>
              )}
              <SwitchErrors
                ratesError={ratesError}
                balance={selectedInputToken.balance}
                inputAmount={debounceInputAmount}
              />
              {txError && <ParaswapErrorDisplay txError={txError} />}
              <SwitchActions
                isWrongNetwork={isWrongNetwork.isWrongNetwork}
                inputAmount={debounceInputAmount}
                inputToken={selectedInputToken.address}
                outputToken={selectedOutputToken.address}
                inputName={selectedInputToken.name}
                outputName={selectedOutputToken.name}
                slippage={slippage}
                blocked={
                  !sellRates ||
                  Number(debounceInputAmount) > Number(selectedInputToken.balance) ||
                  !user
                }
                chainId={selectedChainId}
                route={sellRates}
              />
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', mt: 4, alignItems: 'center' }}>
              <Typography sx={{ mb: 6, textAlign: 'center' }} color="text.secondary">
                Please connect your wallet to be able to switch your tokens.
              </Typography>
              <ConnectWalletButton />
            </Box>
          )}
        </>
      )}
    </>
  );
};
