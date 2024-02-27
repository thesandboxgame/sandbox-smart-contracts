/* eslint-disable mocha/no-setup-in-describe,mocha/no-exports */
import {AsyncFunc} from 'mocha';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {Numeric, ZeroAddress} from 'ethers';
import {Order} from './order';
import {ethers} from 'hardhat';
import {AssetClassType} from './assets';

type SimResultType = 'leftFill' | 'rightFill' | 'leftThrow' | 'rightThrow';
export type FillData = {
  leftTakeValue: number;
  leftMakeValue: number;
  leftFill: number;
  rightTakeValue: number;
  rightMakeValue: number;
  rightFill: number;
};

export const fillOrder = (makeValue: Numeric, takeValue: Numeric): Order => ({
  maker: ZeroAddress,
  taker: ZeroAddress,
  end: 0,
  start: 0,
  salt: 0,
  makeAsset: [{
    assetType: {
      assetClass: AssetClassType.INVALID_ASSET_CLASS,
      data: '0x',
    },
    value: makeValue,
  }],
  takeAsset: [{
    assetType: {
      assetClass: AssetClassType.INVALID_ASSET_CLASS,
      data: '0x',
    },
    value: takeValue,
  }],
});

export async function deployLibAssetTest() {
  const [deployer] = await ethers.getSigners();
  const LibOrderMock = await ethers.getContractFactory('LibOrderMock');
  const libOrderMock = await LibOrderMock.deploy();
  return {
    deployer,
    libOrderMock,
  };
}

export async function contractCheck(
  data: FillData,
  simResult: SimResultType,
  giveLeft: number,
  giveRight: number
) {
  const {
    leftTakeValue,
    leftMakeValue,
    leftFill,
    rightTakeValue,
    rightMakeValue,
    rightFill,
  } = data;
  const {libOrderMock} = await loadFixture(deployLibAssetTest);
  const leftOrder = fillOrder(leftMakeValue, leftTakeValue);
  const rightOrder = fillOrder(rightMakeValue, rightTakeValue);
  if (simResult == 'leftThrow' || simResult == 'rightThrow') {
    await expect(
      libOrderMock.fillOrder(leftOrder, rightOrder, leftFill, rightFill)
    ).to.be.revertedWith(
      simResult == 'leftThrow'
        ? 'fillLeft: unable to fill'
        : 'fillRight: unable to fill'
    );
  } else {
    const [cL, cR] = await libOrderMock.fillOrder(
      leftOrder,
      rightOrder,
      leftFill,
      rightFill
    );
    // Compare with contract result
    expect(cL).to.be.equal(Math.floor(giveLeft));
    expect(cR).to.be.equal(Math.floor(giveRight));
  }
}

function calculateRemainders(data: FillData) {
  const {
    leftTakeValue,
    leftMakeValue,
    leftFill,
    rightTakeValue,
    rightMakeValue,
    rightFill,
  } = data;

  const leftTakeRemainder = leftTakeValue - leftFill;
  const leftMakeRemainder = Math.floor(
    (leftTakeRemainder * leftMakeValue) / leftTakeValue
  );
  const rightTakeRemainder = rightTakeValue - rightFill;
  const rightMakeRemainder = Math.floor(
    (rightTakeRemainder * rightMakeValue) / rightTakeValue
  );
  return {
    data,
    leftTakeRemainder,
    leftMakeRemainder,
    rightTakeRemainder,
    rightMakeRemainder,
  };
}

function simFillOrder(
  data: FillData
): [SimResultType, number, number, string[]] {
  const description = [];
  const {
    leftTakeRemainder,
    leftMakeRemainder,
    rightTakeRemainder,
    rightMakeRemainder,
  } = calculateRemainders(data);
  if (data.leftFill > 0 || data.rightFill > 0) {
    description.push(
      `left has ${leftTakeRemainder} on take and ${leftMakeRemainder} on make side, ` +
        `right has ${rightTakeRemainder} on take and ${rightMakeRemainder} on make side`
    );
  }
  if (rightTakeRemainder > leftMakeRemainder) {
    const rightTake = Math.floor(
      (leftTakeRemainder * rightTakeRemainder) / rightMakeRemainder
    );
    if (rightTake > leftMakeRemainder) {
      description.push(
        `fillLeft: ${leftMakeRemainder}, ${leftTakeRemainder} WON'T WORK, ${price(
          leftMakeRemainder,
          leftTakeRemainder
        )} is unfair for right`
      );
      description.push(
        `fillLeft: unable to fill: ${rightTake} == ${leftTakeRemainder} * ${rightTakeRemainder} / ${rightMakeRemainder} > ${leftMakeRemainder}`
      );
      return ['leftThrow', leftMakeRemainder, leftTakeRemainder, description];
    }
    const p = price(leftMakeRemainder, leftTakeRemainder);
    description.push(
      `leftFill: left will get ${leftTakeRemainder} and give ${leftMakeRemainder} ${p}, right will get ${leftMakeRemainder} and give ${leftTakeRemainder} ${p}`
    );
    return ['leftFill', leftMakeRemainder, leftTakeRemainder, description];
  }
  const makerRemainder = Math.floor(
    (rightTakeRemainder * leftTakeRemainder) / leftMakeRemainder
  );
  const ret = makerRemainder;
  if (makerRemainder > rightMakeRemainder) {
    description.push(
      `fillRight: ${rightTakeRemainder}, ${makerRemainder} WON'T WORK, ${price(
        leftMakeRemainder,
        leftTakeRemainder
      )} is unfair for right`
    );
    description.push(
      `fillRight: unable to fill: ${makerRemainder} == ${rightTakeRemainder} * ${leftTakeRemainder} / ${leftMakeRemainder} > ${rightMakeRemainder}`
    );
    return ['rightThrow', rightTakeRemainder, ret, description];
  }
  const p = price(rightTakeRemainder, ret);
  description.push(
    `rightFill: left will get ${ret} and give ${rightTakeRemainder} ${p}, right will get ${rightTakeRemainder} and give ${ret} ${p}`
  );
  return ['rightFill', rightTakeRemainder, ret, description];
}

function historyTeller(steps: string[], test: AsyncFunc) {
  const title = steps.pop() as string; // ignore empty steps, just testing.
  const history = steps.reverse().reduce(
    (acc, val) => {
      return () => {
        describe(val, acc);
      };
    },
    () => {
      it(title, test);
    }
  );
  history();
}

function price(makeIfLeft: number, takeIfLeft: number) {
  if (takeIfLeft == 0) return 'at zero';
  return `at price ${takeIfLeft / makeIfLeft} (inverse ${
    makeIfLeft / takeIfLeft
  })`;
}

export function runOrderTest(
  data: FillData,
  title: string | undefined = undefined
) {
  function simAndCheck(data: FillData) {
    const [ret, giveLeft, giveRight, description] = simFillOrder(data);
    historyTeller(description, async () => {
      await contractCheck(data, ret, giveLeft, giveRight);
    });
  }

  if (title) {
    describe(title, function () {
      fillOrderTest(data, () => simAndCheck(data));
    });
  } else {
    simAndCheck(data);
  }
}

export function fillOrderTest(
  data: FillData,
  func: (data: FillData) => void = runOrderTest
) {
  const {
    leftTakeValue,
    leftMakeValue,
    leftFill,
    rightTakeValue,
    rightMakeValue,
    rightFill,
  } = data;
  describe(`left asks for ${leftTakeValue} (take) ${
    leftFill == 0 ? '' : `but ${leftFill} was consumed`
  } and is ready to give ${leftMakeValue} (make) ${price(
    leftMakeValue,
    leftTakeValue
  )}.`, function () {
    describe(`right asks for ${rightTakeValue} (take) ${
      rightFill == 0 ? '' : `but ${rightFill} was consumed`
    } and is ready to give ${rightMakeValue} (make) ${price(
      rightTakeValue,
      rightMakeValue
    )}.`, function () {
      func(data);
    });
  });
}

export function fillOrder4Tests(data: FillData) {
  fillOrderTest(data, function () {
    runOrderTest(data);
    runOrderTest(
      {
        leftTakeValue: data.rightTakeValue,
        leftMakeValue: data.rightMakeValue,
        leftFill: data.rightFill,
        rightTakeValue: data.leftTakeValue,
        rightMakeValue: data.leftMakeValue,
        rightFill: data.leftFill,
      },
      'swap left order <-> right order'
    );
    runOrderTest(
      {
        leftTakeValue: data.leftMakeValue,
        leftMakeValue: data.leftTakeValue,
        leftFill: data.rightFill,
        rightTakeValue: data.rightMakeValue,
        rightMakeValue: data.rightTakeValue,
        rightFill: data.leftFill,
      },
      'swap make <-> take'
    );
    runOrderTest(
      {
        leftTakeValue: data.rightMakeValue,
        leftMakeValue: data.rightTakeValue,
        leftFill: data.leftFill,
        rightTakeValue: data.leftMakeValue,
        rightMakeValue: data.leftTakeValue,
        rightFill: data.rightFill,
      },
      'swap make <-> take and left order <-> right order'
    );
  });
}

export function buySellTest(p1: bigint, p2: bigint) {
  it('should be able to sell/buy p1 nfts exactly at p2 price', async function () {
    const {libOrderMock} = await loadFixture(deployLibAssetTest);
    const leftOrder = fillOrder(p1, p2);
    const rightOrder = fillOrder(p2, p1);

    const [leftFill, rightFill] = await libOrderMock.fillOrder(
      leftOrder,
      rightOrder,
      0,
      0
    );
    expect(leftFill).to.be.equal(p1);
    expect(rightFill).to.be.equal(p2);

    // swap orders
    const [leftFill2, rightFill2] = await libOrderMock.fillOrder(
      rightOrder,
      leftOrder,
      0,
      0
    );
    expect(leftFill2).to.be.equal(rightFill);
    expect(rightFill2).to.be.equal(leftFill);
  });

  it('should fail to sell/buy p1 nfts if not paying enough', async function () {
    const {libOrderMock} = await loadFixture(deployLibAssetTest);
    const leftOrder = fillOrder(p1, p2);
    // p2-1 is not enough
    const rightOrder = fillOrder(p2 - 1n, p1);

    await expect(
      libOrderMock.fillOrder(leftOrder, rightOrder, 0n, 0n)
    ).to.be.revertedWith('fillRight: unable to fill');
    await expect(
      libOrderMock.fillOrder(rightOrder, leftOrder, 0n, 0n)
    ).to.be.revertedWith('fillLeft: unable to fill');
  });
}
