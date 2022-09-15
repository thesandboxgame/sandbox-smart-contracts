import {BigNumber} from '@ethersproject/bignumber';
import {DeployFunction} from 'hardhat-deploy/types';

const catalysts: {[key: string]: string}[] = [
  {
    name: 'Common',
    sandMintingFee: '0',
    sandUpdateFee: '0',
    minQuantity: '1',
    maxQuantity: '65535',
  },
  {
    name: 'Rare',
    sandMintingFee: '0',
    sandUpdateFee: '0',
    minQuantity: '1',
    maxQuantity: '65535',
  },
  {
    name: 'Epic',
    sandMintingFee: '0',
    sandUpdateFee: '0',
    minQuantity: '1',
    maxQuantity: '65535',
  },
  {
    name: 'Legendary',
    sandMintingFee: '0',
    sandUpdateFee: '0',
    minQuantity: '1',
    maxQuantity: '65535',
  },
];

const func: DeployFunction = async function (hre) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  const admin = await read('OldCatalysts', {}, 'getAdmin');

  for (let i = 0; i < 4; i++) {
    const config = await read('OldCatalysts', 'getMintData', i);
    const setup = catalysts[i];
    console.log(`${i} ${setup.name}`);
    const keys = [
      'minQuantity',
      'maxQuantity',
      'sandMintingFee',
      'sandUpdateFee',
    ];
    if (
      keys.some((key) => {
        console.log(`${key} ${config[key]} ${setup[key]}`);
        return !BigNumber.from(setup[key]).eq(BigNumber.from(config[key]));
      })
    ) {
      console.log(`Updating minting data for ${setup.name}`);
      await catchUnknownSigner(
        execute(
          'OldCatalysts',
          {from: admin},
          'setConfiguration',
          i,
          setup.minQuantity,
          setup.maxQuantity,
          setup.sandMintingFee,
          setup.sandUpdateFee
        )
      );
    }
  }
};
export default func;
func.tags = ['OldCatalysts', 'OldCatalysts_setup'];
func.dependencies = ['OldCatalysts_deploy'];
func.skip = async () => true; // skip running as this is not to be used, require putting the whole Gem/Catalyst deployment back
