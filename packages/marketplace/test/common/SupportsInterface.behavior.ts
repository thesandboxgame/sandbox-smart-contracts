import {expect} from 'chai';
interface Interfaces {
  [key: string]: string;
}
type SupportsInterfaceFunction = (interfaceId: string) => Promise<boolean>;

// eslint-disable-next-line mocha/no-exports
export function shouldSupportInterfaces(
  supportsInterface: SupportsInterfaceFunction,
  interfaces: Interfaces
) {
  describe('Support Interfaces', function () {
    it('should support specified interfaces', async function () {
      for (const i of Object.values(interfaces)) {
        expect(await supportsInterface(i)).to.be.true;
      }
    });

    it('does not support unspecified interfaces', async function () {
      expect(await supportsInterface('0xffffffff')).to.be.false;
    });
  });
}
