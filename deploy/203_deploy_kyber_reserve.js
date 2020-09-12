const { guard } = require("../lib");
const fs = require("fs");
const path = require("path");
const { BigNumber } = require("ethers");
const configPath = path.join(__dirname, "../data/kyberReserve/apr_input.json");
const configParams = JSON.parse(fs.readFileSync(configPath, "utf8"));

module.exports = async ({ getNamedAccounts, deployments }) => {
  let reserveAdmin;
  let whitelistedAddresses;
  let pricingOperator;
  let reserveOperators;
  let weiDepositAmount;
  let sandDepositAmount;

  const { deploy, execute, read } = deployments;
  const { deployer } = await getNamedAccounts();
  const networkAddress = configParams.kyberNetworkAddress;
  parseInput(configParams);
  deployerAddress = deployer;
  const sandContract = await deployments.get("Sand");
  console.log(`sand add = ${sandContract.address}`);
  console.log("deploying pricing contract...");
  let lcr = await deploy("LiquidityConversionRates", {
    from: deployer,
    args: [deployerAddress, sandContract.address],
    log: true,
  });
  console.log("deploying reserve contract...");
  let kyberReserve = await deploy("KyberReserve", {
    from: deployer,
    args: [networkAddress, lcr.address, deployerAddress],
    log: true,
  });
  console.log(`reserve address: ${kyberReserve.address}`);

  // whitelist addresses
  await whitelistAddressesInReserve(kyberReserve);

  // transfer reserve permissions
  await setReservePermissions(kyberReserve);

  // set reserve address
  console.log("set reserve address in pricing");
  await execute(
    "LiquidityConversionRates",
    { from: deployer, skipUnknownSigner: true },
    "setReserveAddress",
    kyberReserve.address
  );

  // transfer admin rights to pricing operator
  console.log(`transfer admin rights to ${pricingOperator}`);
  await execute(
    "LiquidityConversionRates",
    { from: deployer, skipUnknownSigner: true },
    "transferAdminQuickly",
    pricingOperator
  );
  await depositETH(weiDepositAmount);
  ethBalance = await ethers.provider.getBalance(kyberReserve.address);
  await depositSand(BigNumber.from(sandDepositAmount));
  sandBalance = await read("Sand", "balanceOf", kyberReserve.address);
  console.log("APR setup completed!");
  process.exit(0);
  function parseInput(jsonInput) {
    whitelistedAddresses = jsonInput["whitelistedAddresses"];
    reserveAdmin = jsonInput["reserveAdmin"];
    pricingOperator = jsonInput["pricingOperator"];
    reserveOperators = jsonInput["reserveOperators"];
    weiDepositAmount = jsonInput["weiDepositAmount"];
    sandDepositAmount = jsonInput["sandDepositAmount"];
  }

  async function whitelistAddressesInReserve() {
    console.log("whitelisting addresses...");
    let admin = await read("KyberReserve", "admin");
    console.log(`admin = ${admin}`);
    console.log(`deployer = ${deployer}`);
    for (let whitelistAddress of whitelistedAddresses) {
      let tokw = await read("KyberReserve", "tokenWallet", sandContract.address);
      console.log(`tokw = ${tokw}`);
      await execute(
        "KyberReserve",
        { from: deployer, skipUnknownSigner: true },
        "approveWithdrawAddress",
        sandContract.address,
        whitelistAddress,
        true
      );
    }
  }

  // by default, adds operators and admin as alerters
  async function setReservePermissions() {
    for (let operator of reserveOperators) {
      await addOperator(operator);
      await addAlerter(operator);
    }

    await addAlerter(reserveAdmin);

    await execute("KyberReserve", { from: deployer, skipUnknownSigner: true }, "transferAdminQuickly", reserveAdmin);
  }
  async function addOperator(operator) {
    const operators = await read("KyberReserve", "getOperators");
    if (operators.indexOf(operator) !== -1) {
      console.log(`${operator} was already set as an operator, skipping`);
    } else {
      await execute("KyberReserve", { from: deployer, skipUnknownSigner: true }, "addOperator", operator);
    }
  }

  async function addAlerter(alerter) {
    const alerters = await read("KyberReserve", "getAlerters");
    if (alerters.indexOf(alerter) !== -1) {
      console.log(`${alerter} was already set as an alerter, skipping`);
    } else {
      await execute("KyberReserve", { from: deployer, skipUnknownSigner: true }, "addAlerter", alerter);
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
    await execute("Sand", { from: deployer, skipUnknownSigner: true }, "transfer", kyberReserve.address, value);
  }
};

module.exports.tags = ["KyberReserve"];
