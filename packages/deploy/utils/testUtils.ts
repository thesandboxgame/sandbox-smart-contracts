import {FixtureFunc} from 'hardhat-deploy/dist/types';
import {deployments, ethers} from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {HARDHAT_NETWORK_NAME} from 'hardhat/plugins';
import {Signer} from 'ethers';

export function withSnapshot<T, O>(
  tags: string | string[] = [],
  func: FixtureFunc<T, O> = async () => {
    return <T>{};
  }
): (options?: O) => Promise<T> {
  return deployments.createFixture(
    async (env: HardhatRuntimeEnvironment, options?: O) => {
      const isHardhat = env.network.name === HARDHAT_NETWORK_NAME;
      const skipAll: string[] = [];
      await deployments.fixture(isHardhat ? tags : skipAll, {
        fallbackToGlobal: true,
        keepExistingDeployments: !isHardhat,
      });
      return func(env, options);
    }
  );
}

export async function getContract(
  hre: HardhatRuntimeEnvironment,
  name: string,
  signer?: Signer
) {
  const c = await deployments.get(name);
  return await ethers.getContractAt(c.abi, c.address, signer);
}
