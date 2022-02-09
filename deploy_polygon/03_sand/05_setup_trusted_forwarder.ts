import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const TRUSTED_FORWARDER_V2 = await deployments.getOrNull(
    'TRUSTED_FORWARDER_V2'
  );
  if (!TRUSTED_FORWARDER_V2) return;
  const isTrustedForwarder = await read(
    'PolygonSand',
    'isTrustedForwarder',
    TRUSTED_FORWARDER_V2.address
  );
  if (!isTrustedForwarder) {
    console.log('Setting TRUSTED_FORWARDER_V2 as trusted forwarder');
    const admin = await read('PolygonSand', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'PolygonSand',
        {from: admin, log: true},
        'setTrustedForwarder',
        TRUSTED_FORWARDER_V2.address
      )
    );
  }
};

export default func;
func.tags = ['PolygonSand', 'PolygonSand_setup'];
func.dependencies = ['PolygonSand_deploy', 'TRUSTED_FORWARDER_V2'];
func.runAtTheEnd = true;
