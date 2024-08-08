import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {deployer} = await getNamedAccounts();

  const operatorRole = await read('BatchTransfer', 'OPERATOR_ROLE');

  const operators = [
    '0x782788bB333feB56bbC426588263Db9671F074c1', // (NFT Vault for DAO)
    '0x7A9fe22691c811ea339D9B73150e6911a5343DcA', // (Seb)
    '0x51b66b4cb9053726442752f1a722ce5438553a88', // (QA PROD Account)
  ];

  for (const operator of operators) {
    const isOperator = await read(
      'BatchTransfer',
      'hasRole',
      operatorRole,
      operator
    );
    if (!isOperator) {
      await catchUnknownSigner(
        execute(
          'BatchTransfer',
          {from: deployer, log: true},
          'grantRole',
          operatorRole,
          operator
        )
      );
      log(`[BatchTransfer] Operator role granted to ${operator}`);
    }
  }
};

export default func;

func.tags = ['BatchTransfer', 'BatchTransfer_setup'];
func.dependencies = ['BatchTransfer_deploy'];
