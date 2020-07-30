const {expect} = require("local-chai");
const {setupCatalystUsers} = require("./fixtures");
const {randomBytes, hexlify} = require("ethers/lib/utils");

const LegendaryCatalyst = 3;

const PowerGem = 0;
const DefenseGem = 1;
const SpeedGem = 2;
const MagicGem = 3;
const LuckGem = 4;

function expectGemValues(values, expectedValues, options) {
  options = options || {};
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (expectedValues[i]) {
      if (Array.isArray(expectedValues[i])) {
        expect(v).to.be.within(expectedValues[i][0], expectedValues[i][1]);
      } else {
        expect(v).to.equal(expectedValues[i]);
      }
    } else {
      if (v !== 0) {
        console.log({values, expectedValues});
      }
      expect(v, `gemId ${i} not expected`).to.equal(0);
    }
  }
  if (!options.ignoreMissing) {
    for (const key of Object.keys(expectedValues)) {
      if (parseInt(key) >= values.length) {
        throw new Error(`no value for gemId ${key}`);
      }
    }
  }
}

describe("Catalyst:Values", function () {
  let catalystRegistry;

  async function testValues(catalystId, seed, events, totalNumberOfGemTypes, expectedValues) {
    const numEvents = events.length;
    let pastValues;
    if (Array.isArray(expectedValues)) {
      for (let i = 0; i < numEvents; i++) {
        const subEvents = events.slice(0, i + 1);
        const numGems = subEvents.reduce((prev, curr) => prev + curr.gemIds.length, 0);
        const minValue = (numGems - 1) * 5 + 1;
        const values = await catalystRegistry.getValues(catalystId, seed, subEvents, totalNumberOfGemTypes);
        const expectedValuesConsideringPastOnes = {};
        for (const key of Object.keys(expectedValues[i])) {
          let expectedValue = expectedValues[i][key];
          if (pastValues && pastValues[key]) {
            let minExpectedValue = expectedValue;
            if (Array.isArray(expectedValue)) {
              minExpectedValue = expectedValue[0];
            }
            if (Math.floor((minExpectedValue - 1) / 25) > Math.floor((pastValues[key] - 1) / 25)) {
            } else {
              expectedValue = pastValues[key];
              if (expectedValue < minValue) {
                expectedValue = minValue;
              }
            }
          }
          expectedValuesConsideringPastOnes[key] = expectedValue;
        }
        expectGemValues(values, expectedValuesConsideringPastOnes);
        pastValues = values;
      }
    } else {
      const values = await catalystRegistry.getValues(catalystId, seed, events, totalNumberOfGemTypes);
      expectGemValues(values, expectedValues);
    }
  }
  async function fuzzValues(catalystId, seed, events, totalNumberOfGemTypes, expectedValues, numTimes) {
    numTimes = numTimes || 100;
    const transformedEvents = [];
    for (const event of events) {
      const transformedEvent = {...event};
      transformedEvents.push(transformedEvent);
    }
    for (let i = 0; i < numTimes; i++) {
      for (const event of transformedEvents) {
        event.blockHash = hexlify(randomBytes(32));
      }
      await testValues(catalystId, seed, transformedEvents, totalNumberOfGemTypes, expectedValues);
    }
  }

  beforeEach(async function () {
    const result = await setupCatalystUsers();
    catalystRegistry = result.catalystRegistry;
  });
  it("Minting Asset with 1 Speed Gem", async function () {
    await fuzzValues(
      LegendaryCatalyst,
      LegendaryCatalyst,
      [
        {
          gemIds: [SpeedGem],
        },
      ],
      5,
      {[SpeedGem]: [1, 25]}
    );
  });

  it("Minting Asset with 1 Speed Gem + 1 Magic Gem", async function () {
    await fuzzValues(
      LegendaryCatalyst,
      LegendaryCatalyst,
      [
        {
          gemIds: [SpeedGem, MagicGem],
        },
      ],
      5,
      {[SpeedGem]: [6, 25], [MagicGem]: [6, 25]}
    );
  });

  it("Minting Asset with 2 Power gems  + 1 Luck Gem", async function () {
    await fuzzValues(
      LegendaryCatalyst,
      LegendaryCatalyst,
      [
        {
          gemIds: [PowerGem, PowerGem, MagicGem],
        },
      ],
      5,
      {[PowerGem]: [26, 50], [MagicGem]: [11, 25]}
    );
  });

  it("Minting Asset with 2 Power gems  + 1 Luck Gem in non-order", async function () {
    await fuzzValues(
      LegendaryCatalyst,
      LegendaryCatalyst,
      [
        {
          gemIds: [PowerGem, MagicGem, PowerGem],
        },
      ],
      5,
      {[PowerGem]: [26, 50], [MagicGem]: [11, 25]}
    );
  });

  it("Minting Asset with 1 Speed gem, then adding 1 Speed Gem", async function () {
    await fuzzValues(
      LegendaryCatalyst,
      LegendaryCatalyst,
      [
        {
          gemIds: [SpeedGem],
        },
        {
          gemIds: [SpeedGem],
        },
      ],
      5,
      [{[SpeedGem]: [1, 25]}, {[SpeedGem]: [26, 50]}]
    );
  });

  it("Minting Asset with 1 Speed gem, then adding 1 Magic Gem", async function () {
    await fuzzValues(
      LegendaryCatalyst,
      LegendaryCatalyst,
      [
        {
          gemIds: [SpeedGem],
        },
        {
          gemIds: [MagicGem],
        },
      ],
      5,
      [{[SpeedGem]: [1, 25]}, {[SpeedGem]: [6, 25], [MagicGem]: [6, 25]}]
    );
  });

  it("Minting Asset with 1 Speed gem, then adding 1 Power Gem + Magic Gem", async function () {
    await fuzzValues(
      LegendaryCatalyst,
      LegendaryCatalyst,
      [
        {
          gemIds: [SpeedGem],
        },
        {
          gemIds: [PowerGem, MagicGem],
        },
      ],
      5,
      [{[SpeedGem]: [1, 25]}, {[SpeedGem]: [11, 25], [MagicGem]: [11, 25], [PowerGem]: [11, 25]}]
    );
  });

  it("Minting Asset with 1 Speed Gem + 1 Magic Gem, then adding 2 Speed Gem", async function () {
    await fuzzValues(
      LegendaryCatalyst,
      LegendaryCatalyst,
      [
        {
          gemIds: [SpeedGem, MagicGem],
        },
        {
          gemIds: [SpeedGem, SpeedGem],
        },
      ],
      5,
      [
        {[SpeedGem]: [6, 25], [MagicGem]: [6, 25]},
        {[SpeedGem]: [51, 75], [MagicGem]: [16, 25]},
      ]
    );
  });

  it("Minting Asset with 1 Power gem, then adding 1 Magic Gem", async function () {
    await fuzzValues(
      LegendaryCatalyst,
      LegendaryCatalyst,
      [
        {
          gemIds: [PowerGem],
        },
        {
          gemIds: [MagicGem],
        },
      ],
      5,
      [{[PowerGem]: [1, 25]}, {[PowerGem]: [6, 25], [MagicGem]: [6, 25]}]
    );
  });

  it("Minting Asset with 4 Gem one by one get 16-25 for all", async function () {
    await fuzzValues(
      LegendaryCatalyst,
      LegendaryCatalyst,
      [
        {
          gemIds: [DefenseGem],
        },
        {
          gemIds: [LuckGem],
        },
        {
          gemIds: [SpeedGem],
        },
        {
          gemIds: [MagicGem],
        },
      ],
      5,
      [
        {[DefenseGem]: [1, 25]},
        {[DefenseGem]: [6, 25], [LuckGem]: [6, 25]},
        {[DefenseGem]: [11, 25], [LuckGem]: [11, 25], [SpeedGem]: [11, 25]},
        {[DefenseGem]: [16, 25], [LuckGem]: [16, 25], [SpeedGem]: [16, 25], [MagicGem]: [16, 25]},
      ]
    );
  });
});
