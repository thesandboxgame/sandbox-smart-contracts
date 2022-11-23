import {network} from 'hardhat';
import hre from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import 'dotenv/config';
import catalysts from '../../data/catalysts';
import gems from '../../data/gems';

/**
 * How to use:
 *  - Insert the recipient contract address on line 22
 *  - yarn run hardhat run --network mumbai ./scripts/faucet/mint_cats_gems_to_mumbai_faucet.ts
 */
void (async () => {
  const {getNamedAccounts, deployments} = hre;
  const {execute} = deployments;
  // Only for minting tokens on mumbai network
  if (network.name !== 'hardhat' && network.name !== 'mumbai') {
    throw new Error('only for mumbai');
  }

  // Insert recipient contract address here
  const faucetContractAddress = '';
  const mintAmount = BigNumber.from(100).mul('1000000000000000000'); // decimals 18

  // User for contract interactions
  const {catalystAdmin, gemAdmin} = await getNamedAccounts();

  // Catalysts
  for (const catalyst of catalysts) {
    const catalystContract = await deployments.get(
      `PolygonCatalyst_${catalyst.symbol}`
    );

    // Mint each token type
    if (catalystContract && mintAmount > BigNumber.from('0')) {
      console.log(
        `Minting PolygonCatalyst_${catalyst.symbol} to contract address ${faucetContractAddress}`
      );

      await execute(
        `PolygonCatalyst_${catalyst.symbol}`,
        {from: catalystAdmin},
        'mint',
        faucetContractAddress,
        mintAmount
      );
      console.log(
        `Successfully minted PolygonCatalyst_${catalyst.symbol} `,
        mintAmount.toString(),
        ' tokens'
      );
    }
  }

  // Gems
  for (const gem of gems) {
    const gemContract = await deployments.get(`PolygonGem_${gem.symbol}`);

    // Mint each token type
    if (gemContract && mintAmount > BigNumber.from('0')) {
      console.log(
        `Minting PolygonGem_${gem.symbol} to contract address ${faucetContractAddress}`
      );

      await execute(
        `PolygonGem_${gem.symbol}`,
        {from: gemAdmin},
        'mint',
        faucetContractAddress,
        mintAmount
      );
      console.log(
        `Successfully minted PolygonGem_${gem.symbol} `,
        mintAmount.toString(),
        ' tokens'
      );
    }
  }
})();
