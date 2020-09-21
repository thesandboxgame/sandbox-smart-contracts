const configParams = require("../data/kyberReserve/apr_input");
const {BigNumber} = require("ethers");
const {solidityKeccak256} = ethers.utils;

module.exports = async ({getChainId, getNamedAccounts, deployments}) => {
  const chainId = await getChainId();
  if (chainId === "31337") {
    return;
  }
  let reserveAdmin;
  let whitelistedAddresses;
  let reserveOperators;
  let weiDepositAmount;
  let sandDepositAmount;

  const {execute, read, log} = deployments;
  const {deployer} = await getNamedAccounts();
  parseInput(configParams[chainId]);
  const sandContract = await deployments.get("Sand");
  const kyberReserve = await deployments.get("KyberReserve");
  // whitelist addresses
  await whitelistAddressesInReserve();

  // transfer reserve permissions
  await setReservePermissions();
  await depositETH(weiDepositAmount);
  await depositSand(BigNumber.from(sandDepositAmount));

  function parseInput(jsonInput) {
    whitelistedAddresses = jsonInput["whitelistedAddresses"];
    reserveAdmin = jsonInput["reserveAdmin"];
    weiDepositAmount = jsonInput["weiDepositAmount"];
    sandDepositAmount = jsonInput["sandDepositAmount"];
  }

  async function whitelistAddressesInReserve() {
    for (let whitelistAddress of whitelistedAddresses) {
      let key = solidityKeccak256(["address", "address"], [sandContract.address, whitelistAddress]);
      let approved = await read("KyberReserve", "approvedWithdrawAddresses", key);
      if (!approved) {
        log(`approveWithdrawAddress, token = ${sandContract.address}, address = ${whitelistAddress}`);
        await execute(
          "KyberReserve",
          {from: deployer, skipUnknownSigner: true},
          "approveWithdrawAddress",
          sandContract.address,
          whitelistAddress,
          true
        );
      }
    }
  }

  // by default, adds operators and admin as alerters
  async function setReservePermissions() {
    for (let operator of reserveOperators) {
      await addOperator(operator);
      await addAlerter(operator);
    }

    await addAlerter(reserveAdmin);
    const admin = await read("KyberReserve", "admin");
    if (admin.toLowerCase() !== reserveAdmin.toLowerCase()) {
      log(`transferAdminQuickly, admin = ${reserveAdmin}`);
      await execute("KyberReserve", {from: deployer, skipUnknownSigner: true}, "transferAdminQuickly", reserveAdmin);
    }
  }
  async function addOperator(operator) {
    const operators = await read("KyberReserve", "getOperators");
    operators = operators.map((op) => op.toLowerCase());
    if (operators.indexOf(operator.toLowerCase()) !== -1) {
      log(`${operator} was already set as an operator, skipping`);
    } else {
      await execute("KyberReserve", {from: deployer, skipUnknownSigner: true}, "addOperator", operator);
    }
  }

  async function addAlerter(alerter) {
    const alerters = await read("KyberReserve", "getAlerters");
    alerters = alerters.map((al) => al.toLowerCase());
    if (alerters.indexOf(alerter.toLowerCase()) !== -1) {
      log(`${alerter} was already set as an alerter, skipping`);
    } else {
      await execute("KyberReserve", {from: deployer, skipUnknownSigner: true}, "addAlerter", alerter);
    }
  }

  async function depositETH(value) {
    await deployments.rawTx({
      to: kyberReserve.address,
      from: deployer,
      value,
    });
  }

  async function depositSand(value) {
    await execute("Sand", {from: deployer, skipUnknownSigner: true}, "transfer", kyberReserve.address, value);
  }
};
module.exports.dependencies = ["KyberReserve"];
