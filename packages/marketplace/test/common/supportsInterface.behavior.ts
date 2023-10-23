import {expect} from 'chai';
interface Interfaces {
  [key: string]: string;
}
type SupportsInterfaceFunction = (interfaceId: string) => Promise<boolean>;

export async function shouldSupportsInterface(
  supportsInterface: SupportsInterfaceFunction,
  interfaces: Interfaces
) {
  describe('Support Interfaces', function () {
    it('should support specified interfaces', async function () {
      for (const i of Object.values(interfaces)) {
        expect(await supportsInterface(i)).to.be.true;
      }
    });
  });
}

export async function shouldNotSupportsInterface(
  supportsInterface: SupportsInterfaceFunction
) {
  describe('Supports Only Declared Interfaces', function () {
    it('does not support unspecified interfaces', async function () {
      expect(await supportsInterface('0xffffffff')).to.be.false;
    });
  });
}
