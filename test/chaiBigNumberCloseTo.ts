import chaiModule from 'chai';
import {BigNumber, BigNumberish} from 'ethers';
import AssertionPrototype = Chai.AssertionPrototype;

// waffle chai must support closeTo, but the code is missing.
// https://github.com/EthWorks/Waffle/issues/512
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Chai {
    interface CloseTo {
      (
        expected: BigNumberish,
        delta: BigNumberish,
        message?: string
      ): Assertion;
    }
  }
}

export function addBigNumberCloseToChai(): void {
  chaiModule.use((chai, utils) => {
    const closeTo = function (_super: Chai.CloseTo) {
      return function (
        this: AssertionPrototype,
        value: BigNumberish,
        delta: BigNumberish,
        msg: string | undefined
      ): void {
        const obj = utils.flag(this, 'object');
        if (obj) {
          const expected = BigNumber.from(value);
          const actual = BigNumber.from(obj);
          const d = BigNumber.from(delta);
          this.assert(
            expected.sub(actual).abs().lte(d),
            'expected #{act} to be close to #{exp} +/- ' + d.toString(),
            'expected #{act} not to be close to #{exp} +/- ' + d.toString(),
            value.toString(),
            obj.toString()
          );
        } else {
          _super.apply(this, [value, delta, msg]);
        }
      };
    };
    chai.Assertion.overwriteMethod('closeTo', closeTo);
    chai.Assertion.overwriteMethod('approximately', closeTo);
  });
}
