const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {rawTx, execute} = deployments;
const {Wallet} = require("@ethersproject/wallet");
const {BigNumber} = require("@ethersproject/bignumber");

const parseSheet = require("../lib/parseSheet");

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
async function mint({creator, catalystId, gemIds, quantity}) {
  console.log(
    "mint(address from, uint40 packId, bytes32 metadataHash, uint256 catalystId, uint256[] calldata gemIds, uint256 quantity, address to, bytes calldata data)"
  );
  console.log("from:");
  console.log(creator);
  console.log("packId:");
  console.log(0);
  console.log("metadataHash:");
  console.log(dummyHash);
  console.log("catalystId:");
  console.log(catalystId);
  console.log("gemIds:");
  console.log(gemIds);
  console.log("quantity:");
  console.log(quantity);
  console.log("to:");
  console.log(creator);
  console.log("data:");
  console.log("0x");
}

const total = {
  eth_gasUsed: BigNumber.from(0),
  sand_gasUsed: BigNumber.from(0),
  gems_gasUsed: BigNumber.from(0),
  catalysts_gasUsed: BigNumber.from(0),
  mint_gasUsed: BigNumber.from(0),
  airdrop_gasUsed: BigNumber.from(0),
  total_gasUsed: BigNumber.from(0),

  commonMint_gasUsed: BigNumber.from(0),
};

const packIds = {};

async function mintMultiple({creatorWallet, assets, gems, catalysts, sand, useSingle}) {
  if (assets.length === 0) {
    return;
  }
  const waddr = creatorWallet.address.toLowerCase();
  let packId = packIds[waddr] || 0;

  // console.log(`minting ${assets.length} assets... with ${gems.reduce((prev, curr) => prev + curr.quantity, 0)} gems`);
  const {deployer, sandBeneficiary, gemMinter, catalystMinter} = await getNamedAccounts();
  // console.log(
  //   "mintMultiple(address from, uint40 packId, bytes32 metadataHash, AssetData[] assets, address to, bytes calldata data)"
  // );
  // console.log("from:");
  // console.log(creatorWallet.address);
  // console.log("packId:");
  // console.log(packId);
  // console.log("metadataHash:");
  // console.log(dummyHash);
  // console.log("assets:");
  // console.log(assets); // assets);
  // console.log("to:");
  // console.log(creatorWallet.address);
  // console.log("data:");
  // console.log("0x");

  // console.log("giving ETH...");
  const {gasUsed: eth_gasUsed} = await rawTx({from: deployer, to: creatorWallet.address, value: "500000000000000000"}); // TODO exact amount
  // TODO  record("ETH", receipt);
  // console.log("giving Sand...");
  let sand_gasUsed;

  if (BigNumber.from(sand).gt(0)) {
    const sandReceipt = await execute("Sand", {from: sandBeneficiary}, "transfer", creatorWallet.address, sand); // TODO exact amount
    sand_gasUsed = sandReceipt.gasUsed;
  } else {
    sand_gasUsed = BigNumber.from(0);
  }

  // await console.log("giving Gems...");
  const {gasUsed: gems_gasUsed} = await execute(
    "Gem",
    {from: gemMinter},
    "batchMint",
    creatorWallet.address,
    gems.map((v) => v.id),
    gems.map((v) => v.quantity)
  ); // TODO exact amount
  // console.log("giving Catalysts");
  let catalysts_gasUsed = BigNumber.from(0);
  for (const catalystName of Object.keys(catalysts)) {
    const quantity = catalysts[catalystName];
    if (quantity > 0) {
      const receipt = await execute(
        "Catalyst",
        {from: catalystMinter},
        "mint",
        creatorWallet.address,
        getCatalystIdFronName(catalystName),
        quantity
      );
      catalysts_gasUsed = catalysts_gasUsed.add(receipt.gasUsed);
    }
  }

  // console.log(`minting ${assets.length} assets...`);
  const CatalystMinter = await ethers.getContract("CatalystMinter", creatorWallet.connect(ethers.provider));

  let mint_gasUsed = BigNumber.from(0);
  if (useSingle) {
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      // mint(address from, uint40 packId, bytes32 metadataHash, uint256 catalystId, uint256[] calldata gemIds, uint256 quantity, address to, bytes calldata data
      const {gasUsed} = await CatalystMinter.mint(
        creatorWallet.address,
        packId,
        dummyHash,
        asset.catalystId,
        asset.gemIds,
        asset.quantity,
        creatorWallet.address,
        "0x",
        {
          gasLimit: 8000000,
        }
      ).then((tx) => tx.wait());
      mint_gasUsed = mint_gasUsed.add(gasUsed);
      packId++;
    }
  } else {
    const gemsQuantities = [0, 0, 0, 0, 0];
    const catalystsQuantities = [0, 0, 0, 0];
    for (const asset of assets) {
      for (const gemId of asset.gemIds) {
        gemsQuantities[gemId]++;
      }
      catalystsQuantities[asset.catalystId]++;
    }
    const {gasUsed} = await CatalystMinter.mintMultiple(
      creatorWallet.address,
      packId,
      dummyHash,
      gemsQuantities,
      catalystsQuantities,
      assets,
      creatorWallet.address,
      "0x",
      {
        gasLimit: 8000000,
      }
    ).then((tx) => tx.wait());
    mint_gasUsed = gasUsed;
    packId++;
  }

  // Use old method (no catalyst no gems, no Sand) for comparison
  const CommonMinter = await ethers.getContract("CommonMinter", creatorWallet.connect(ethers.provider));
  const {gasUsed: commonMint_gasUsed} = await CommonMinter.mintMultipleFor(
    creatorWallet.address,
    packId,
    dummyHash,
    assets.map((v) => v.quantity),
    creatorWallet.address,
    "0x",
    0,
    {gasLimit: 8000000}
  ).then((tx) => tx.wait());
  packId++;

  packIds[waddr] = packId;

  const airdrop_gasUsed = eth_gasUsed.add(sand_gasUsed).add(gems_gasUsed).add(catalysts_gasUsed);
  const total_gasUsed = mint_gasUsed.add(airdrop_gasUsed);

  total.eth_gasUsed = total.eth_gasUsed.add(eth_gasUsed);
  total.sand_gasUsed = total.sand_gasUsed.add(sand_gasUsed);
  total.gems_gasUsed = total.gems_gasUsed.add(gems_gasUsed);
  total.catalysts_gasUsed = total.catalysts_gasUsed.add(catalysts_gasUsed);
  total.mint_gasUsed = total.mint_gasUsed.add(mint_gasUsed);
  total.airdrop_gasUsed = total.airdrop_gasUsed.add(airdrop_gasUsed);
  total.total_gasUsed = total.total_gasUsed.add(total_gasUsed);

  total.commonMint_gasUsed = total.commonMint_gasUsed.add(commonMint_gasUsed);
  // console.log({
  //   eth_gasUsed: eth_gasUsed.toNumber(),
  //   sand_gasUsed: sand_gasUsed.toNumber(),
  //   gems_gasUsed: gems_gasUsed.toNumber(),
  //   catalysts_gasUsed: catalysts_gasUsed.toNumber(),
  //   mint_gasUsed: mint_gasUsed.toNumber(),
  //   airdrop_gasUsed: airdrop_gasUsed.toNumber(),
  //   total_gasUsed: total_gasUsed.toNumber(),

  //   commonMint_gasUsed: commonMint_gasUsed.toNumber(),
  // });
}

function catalyst(type) {
  return {
    name: `${type}Catalyst`,
    parse: (value) => ({
      name: `${type}Catalyst`,
      quantity: value === "" ? 0 : parseInt(value, 10),
    }),
  };
}

function gem(type) {
  return {
    name: `${type}Gem`,
    parse: (value) => ({
      name: `${type}Gem`,
      id: getGemId(type),
      quantity: value === "" ? 0 : parseInt(value, 10),
    }),
  };
}

function getGemId(type) {
  return ["Power", "Defense", "Speed", "Magic", "Luck"].indexOf(type);
}

function getCatalystIdFronName(catalystName) {
  return ["CommonCatalyst", "RareCatalyst", "EpicCatalyst", "LegendaryCatalyst"].indexOf(catalystName);
}

function getNumberOfGems(catalystName) {
  switch (catalystName) {
    case "CommonCatalyst":
      return 1;
    case "RareCatalyst":
      return 2;
    case "EpicCatalyst":
      return 3;
    case "LegendaryCatalyst":
      return 4;
  }
  return -1;
}

function getQuantity(catalystName) {
  switch (catalystName) {
    case "CommonCatalyst":
      return 200;
    case "RareCatalyst":
      return 50;
    case "EpicCatalyst":
      return 10;
    case "LegendaryCatalyst":
      return 1;
  }
  return -1;
}

function handleGemIds(num, row) {
  const gemIds = [];
  const potential = ["Power", "Defense", "Speed", "Magic", "Luck"];
  for (let i = 0; i < num; i++) {
    for (let j = 0; j < 5; j++) {
      const index = (i + j) % 5;
      if (row[`${potential[index]}Gem`].quantity > 0) {
        gemIds.push(row[`${potential[index]}Gem`].id);
        row[`${potential[index]}Gem`].quantity--;
        break;
      }
    }
  }
  return gemIds;
}

async function addAssets(wallet, assets, row, catalystName) {
  const catalystId = getCatalystIdFronName(catalystName);
  for (let i = 0; i < row[catalystName].quantity; i++) {
    assets.push({
      gemIds: handleGemIds(getNumberOfGems(catalystName), row),
      quantity: getQuantity(catalystName) + i,
      catalystId,
    });
  }
}

const creators = {};
async function handleRow(row) {
  const {creator} = row;

  const sand = 0; // "100000000000000000000000"; // TODO
  const catalysts = {
    CommonCatalyst: row.CommonCatalyst.quantity,
    RareCatalyst: row.RareCatalyst.quantity,
    EpicCatalyst: row.EpicCatalyst.quantity,
    LegendaryCatalyst: row.LegendaryCatalyst.quantity,
  };
  const gems = [];
  const gemTypes = ["Power", "Defense", "Speed", "Magic", "Luck"];
  for (let i = 0; i < gemTypes.length; i++) {
    const gemName = gemTypes[i];
    const gem = row[`${gemName}Gem`];
    if (gem.quantity > 0) {
      gems.push({id: i, quantity: gem.quantity});
    }
  }

  let creatorWallet = creators[creator];
  if (!creatorWallet) {
    creatorWallet = creators[creator] = Wallet.createRandom();
  } else {
    // console.log(`Reusing creator ${creator}`);
  }
  const assets = [];
  await addAssets(creatorWallet, assets, row, "CommonCatalyst");
  await addAssets(creatorWallet, assets, row, "RareCatalyst");
  await addAssets(creatorWallet, assets, row, "EpicCatalyst");
  await addAssets(creatorWallet, assets, row, "LegendaryCatalyst");

  // console.log(JSON.stringify(assets, null, "  "));
  // for (const asset of assets) {
  //   await mint({
  //     creator: creatorWallet.address,
  //     catalystToken: asset.catalystToken,
  //     gemIds: asset.gemIds,
  //     quantity: asset.quantity,
  //   });
  // }
  await mintMultiple({creatorWallet, assets, gems, catalysts, sand, useSingle: process.argv[2] === "single"});
}

(async () => {
  const CatalystMinter = await ethers.getContractOrNull("CatalystMinter");
  if (!CatalystMinter) {
    console.log("deploying...");
    await deployments.run();
  }
  const sheet = await parseSheet("1HIJYoveEvaaOzYngL7V8OygkDuEcqOweBPJw5Uk7XAI", "Cata/Gem Count", {
    startRow: 3,
    endRow: 57,
    fields: {
      1: "cell",
      2: "creator",
      3: catalyst("Common"),
      4: catalyst("Rare"),
      5: catalyst("Epic"),
      6: catalyst("Legendary"),
      7: gem("Power"),
      8: gem("Defense"),
      9: gem("Speed"),
      10: gem("Magic"),
      11: gem("Luck"),
    },
    filter: (object) => object.cell !== "",
  });

  for (const row of sheet) {
    // console.log("------------------------------------------------------------------");
    await handleRow(row);
    // console.log("");
    // console.log("");
  }
  console.log("TOTAL");
  console.log({
    eth_gasUsed: total.eth_gasUsed.toNumber(),
    sand_gasUsed: total.sand_gasUsed.toNumber(),
    gems_gasUsed: total.gems_gasUsed.toNumber(),
    catalysts_gasUsed: total.catalysts_gasUsed.toNumber(),
    mint_gasUsed: total.mint_gasUsed.toNumber(),
    airdrop_gasUsed: total.airdrop_gasUsed.toNumber(),
    total_gasUsed: total.total_gasUsed.toNumber(),

    commonMint_gasUsed: total.commonMint_gasUsed.toNumber(),
  });
})();
