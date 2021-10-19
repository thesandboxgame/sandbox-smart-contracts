import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {Contract} from 'ethers';
import {withSnapshot} from '../../utils';
import {waitFor} from '../../utils';

export const setupPolygonSandBatchDeposit = withSnapshot(
  ['PolygonSand'],
  async () => {
    const polygonSandContract: Contract = await ethers.getContract(
      'PolygonSand'
    );
    const {deployer, sandAdmin} = await getNamedAccounts();

    await deployments.deploy(`PolygonSandBatchDeposit`, {
      contract: 'PolygonSandBatchDeposit',
      from: deployer,
      log: true,
      args: [polygonSandContract.address],
    });

    const polygonSandBatchDepositContract: Contract = await ethers.getContract(
      'PolygonSandBatchDeposit'
    );

    await waitFor(
      polygonSandContract
        .connect(ethers.provider.getSigner(deployer))
        .updateChildChainManager(polygonSandBatchDepositContract.address)
    );

    return {
      deployer,
      sandAdmin,
      polygonSandContract,
      polygonSandBatchDepositContract,
    };
  }
);
