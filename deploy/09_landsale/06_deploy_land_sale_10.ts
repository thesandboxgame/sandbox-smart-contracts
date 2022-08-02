import {
  getDeadline,
  getLandSales,
  LandSale,
  writeProofs,
  setAsLandMinter,
} from '../../data/landSales/getLandSales';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const LANDSALE_NAME = 'LandPreSale_10';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    landSaleBeneficiary,
    backendReferralWallet,
    landSaleFeeRecipient,
    landSaleAdmin,
  } = await getNamedAccounts();

  const sandContract = await deployments.get('Sand');
  const landContract = await deployments.get('Land');
  const assetContract = await deployments.get('Asset');

  async function deployLandSale(landSale: LandSale) {
    const {lands, merkleRootHash, sector} = landSale;

    const landSaleName = `${LANDSALE_NAME}_${sector}`;
    const deadline = getDeadline(hre, sector);

    const landSaleDeployment = await deploy(landSaleName, {
      from: deployer,
      linkedData: lands,
      contract: 'EstateSaleWithFee',
      args: [
        landContract.address,
        sandContract.address,
        sandContract.address,
        landSaleAdmin,
        landSaleBeneficiary,
        merkleRootHash,
        deadline,
        backendReferralWallet,
        2000,
        '0x0000000000000000000000000000000000000000',
        assetContract.address,
        landSaleFeeRecipient,
      ],
      skipIfAlreadyDeployed: true,
      log: true,
    });

    writeProofs(hre, landSaleName, landSale);

    await setAsLandMinter(hre, landSaleDeployment.address);
  }

  const landSales = await getLandSales(
    LANDSALE_NAME,
    hre.network.name,
    hre.network.live
  );

  for (const landSale of landSales) {
    await deployLandSale(landSale);
  }
};

export default func;
func.tags = [LANDSALE_NAME, LANDSALE_NAME + '_deploy'];
func.dependencies = ['Sand_deploy', 'Land_deploy', 'Asset_deploy'];
func.skip = skipUnlessTest;
