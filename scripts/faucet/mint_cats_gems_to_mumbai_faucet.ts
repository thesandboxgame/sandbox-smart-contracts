import {deployments, getNamedAccounts, network} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import 'dotenv/config';
import catalysts from '../../data/catalysts';
import gems from '../../data/gems';

const {execute} = deployments;

/**
 * How to use:
 *  - yarn run hardhat run --network mumbai_test ./scripts/faucet/mint_cats_gems_to_mumbai_faucet.ts
 */
void (async () => {
  // Only for minting tokens on mumbai_test (local) network
  // Note: change name from 'mumbai_test' to 'mumbai' for QA
  if (network.name !== 'hardhat' && network.name !== 'mumbai_test') {
    throw new Error('only for mumbai_test');
  }

  // Fetching parameter
  const faucetContractAddress = '0x8633EC659f26089287CF4fDf86a51Cc4aC08dC23';
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
        `Minting PolygonCatalyst_${catalyst.symbol} to Faucet contract address ${faucetContractAddress}`
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
        `Minting PolygonGem_${gem.symbol} to Faucet contract address ${faucetContractAddress}`
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
