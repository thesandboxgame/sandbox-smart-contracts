const {deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {execute} = deployments;

function getGems(gems) {
  const names = ["Power", "Defense", "Speed", "Magic", "Luck"];
  const ids = [0, 1, 2, 3, 4];
  const amounts = [0, 0, 0, 0, 0];
  for (const key of Object.keys(gems)) {
    const index = names.indexOf(key);
    if (index < 0) {
      throw new Error(`Invalid Gem Name : ${key}`);
    }
    amounts[index] = gems[key];
  }
  return {ids, amounts};
}

function getCatalysts(catalysts) {
  const names = ["Common", "Rare", "Epic", "Legendary"];
  const ids = [0, 1, 2, 3];
  const amounts = [0, 0, 0, 0];
  for (const key of Object.keys(catalysts)) {
    const index = names.indexOf(key);
    if (index < 0) {
      throw new Error(`Invalid Catalyst Name : ${key}`);
    }
    amounts[index] = catalysts[key];
  }
  return {ids, amounts};
}

(async () => {
  const {gemMinter, catalystMinter} = await getNamedAccounts();
  const to = "0x0000000000000000000000000000000000000000";
  const gems = getGems({
    Power: 32,
    Defense: 11,
    Speed: 25,
    Magic: 8,
    Luck: 26,
  });
  const catalysts = getCatalysts({
    Common: 2,
    Rare: 2,
    Epic: 4,
    Legendary: 24,
  });
  await execute("Gem", {from: gemMinter, skipUnknownSigner: true}, "batchMint", to, gems.ids, gems.amounts);
  await execute(
    "Catalyst",
    {from: catalystMinter, skipUnknownSigner: true},
    "batchMint",
    to,
    catalysts.ids,
    catalysts.amounts
  );
})();
