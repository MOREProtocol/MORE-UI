import { aggrokittyswapFacet } from './aggrokittyswap';
import { curveFacet } from './curve';
import { multirewardsFacet } from './multirewards';
import { moreFacet } from './more';
import { morphoFacet } from './morpho';
import { moreleverageFacet } from './moreleverage';
import { uniswapFacet } from './uniswap';

export const actions = [
  uniswapFacet,
  moreFacet,
  morphoFacet,
  moreleverageFacet,
  aggrokittyswapFacet,
  multirewardsFacet,
  curveFacet,
].sort((a, b) => a.name.localeCompare(b.name));

export default actions;
