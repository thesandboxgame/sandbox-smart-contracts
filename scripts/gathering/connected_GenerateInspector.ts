import {ethers} from 'hardhat';
import {read} from '../utils/spreadsheet';

// This script prepare data for an external contract (0xc653e1b3a971078812a72d11c45ad71e00f3ad1f)
// The function called is send1155ToAddresses() - check the source code => https://etherscan.io/address/0xc653e1b3a971078812a72d11c45ad71e00f3ad1f#code
// This function takes in 4 parameters

//   address[] calldata userAddresses,
//   uint256[] calldata tokenIds,
//   uint256[] calldata amounts,
//   address tokenAddress

// The script takes a list of address from a spreadsheet.
// 1. remove the enclosing array (from string[][] to string[])
// 2. ensure the array only contain unique data (no doublons)
// 3. trim for whitespaces (as users often put some before/after)
// 4. check the format address is valid && address is not a contract
// 5. if address was not valid, check if it's an ens address
// 6. await all promises (because of ens resolution)
// 7. match address array with 2nd and 3rd params (tokenIds & amounts)

// 8. console.log on the terminal, redirect: $ yarn mainnet:run scripts/gathering/connected_GenerateInspector.ts > InspectorGumShoe
// 9. console.error on the terminal, show invalid address (contract / not ens)

async function main() {
  const provider = ethers.provider;
  const AssetAddress = '0xa342f5d851e866e18ff98f351f2c6637f4478db5';
  const AssetId =
    '55464657044963196816950587289035428064568320970692304673817341489687556012032';

  const data: Array<string[]> = await read(
    {
      document: '1aSFdWvHpQEQrUu6eRVRNfVan8-OVILS16ft6uowhX5c',
      sheet: 'Mission #2',
    },
    'E2:E1530'
  );

  const cleanedData: string[] = [];

  data.map((val) => cleanedData.push(val[0]));
  const cleanUniqueData = [...new Set(cleanedData)];

  const ids: string[] = [];
  const amounts: number[] = [];

  const isAddressNotContract = async (address: string) => {
    const result = await provider.getCode(address);
    return result === '0x';
  };

  const verifyAddress = async (address: string) => {
    const addressClean: string = address.replace(/\s/g, '');
    if (ethers.utils.isAddress(addressClean)) {
      if (!(await isAddressNotContract(addressClean))) {
        console.error('contract are not eligible:\t', addressClean);
        return false;
      }
      return addressClean;
    } else {
      try {
        const resolvedEns = await provider.resolveName(addressClean);
        if (resolvedEns !== null && address !== '.eth') {
          return resolvedEns;
        }
        console.error('failed to resolve ens:\t\t', addressClean);
        return false;
      } catch (err) {
        // console.error(err);
      }
    }
  };

  const script = async () =>
    Promise.all(cleanUniqueData.map((add) => verifyAddress(add)));

  const scriptLog = (
    arrayResolvedAddress: Array<string | false | undefined>
  ) => {
    let index = 0;
    const batchSize = 200;
    const length: number = arrayResolvedAddress.length;

    if (length < batchSize) console.log('===> ONE call needed <===\n\n');
    else console.log('===> MULTIPLE call needed <===\n\n');

    while (index <= length) {
      console.log(`
        execute the following on 0xc653e1b3a971078812a72d11c45ad71e00f3ad1f (MultiSender)
        function: send1155ToAddresses
        args:

      - ${arrayResolvedAddress.slice(index, index + batchSize).join(',')}

      - ${ids.slice(index, index + batchSize).join(',')}

      - ${amounts.slice(index, index + batchSize).join(',')}

      - ${AssetAddress}
      \n\n\n`);
      index += batchSize;
    }
  };

  script()
    .then(async (add) => {
      const finalArray: (string | false | undefined)[] = add.filter(Boolean);
      finalArray.map(() => {
        ids.push(AssetId);
        amounts.push(1);
      });
      scriptLog(finalArray);
    })
    .catch((err) => console.log(err));
}

main();
