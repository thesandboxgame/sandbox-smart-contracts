import {BigNumber} from '@ethersproject/bignumber';
import {deployments} from 'hardhat';

const {read} = deployments;

void (async () => {
  for (let i = 0; i < 4; i++) {
    const mintData = await read('Catalyst', 'getMintData', i);
    const maxGems = BigNumber.from(mintData.maxGems).mul(
      BigNumber.from(2).pow(240)
    );
    const minQuantity = BigNumber.from(mintData.minQuantity).mul(
      BigNumber.from(2).pow(224)
    );
    let mintDataMaxQuantity = mintData.maxQuantity;
    if (i == 3) {
      if (mintDataMaxQuantity !== 200) {
        throw new Error('was supposed to be 200');
      }
      mintDataMaxQuantity = 220;
    }
    const maxQuantity = BigNumber.from(mintDataMaxQuantity).mul(
      BigNumber.from(2).pow(208)
    );
    const sandMintingFee = BigNumber.from(mintData.sandMintingFee).mul(
      BigNumber.from(2).pow(120)
    );
    // console.log(i, {
    //   maxGems: mintData.maxGems.toString(),
    //   minQuantity: mintData.minQuantity.toString(),
    //   maxQuantity: mintData.maxQuantity.toString(),
    //   sandMintingFee: mintData.sandMintingFee.toString(),
    // });

    console.log({
      maxGems: maxGems.div(BigNumber.from(2).pow(240)).toString(),
      minQuantity: minQuantity.div(BigNumber.from(2).pow(224)).toString(),
      maxQuantity: maxQuantity.div(BigNumber.from(2).pow(208)).toString(),
      sandMintingFee: sandMintingFee.div(BigNumber.from(2).pow(120)).toString(),
    });
  }
})();
