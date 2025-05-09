import { aggrokittyswapFacet } from './aggrokittyswap';
import { kittypunchfarmFacet } from './kittypunchfarm';
import { moreFacet } from './more';
import { morphoFacet } from './morpho';
import { origamiFacet } from './origami';
import { uniswapFacet } from './uniswap';

export const actions = [uniswapFacet, moreFacet, morphoFacet, origamiFacet, aggrokittyswapFacet, kittypunchfarmFacet].sort((a, b) =>
  a.name.localeCompare(b.name)
);

export default actions;
