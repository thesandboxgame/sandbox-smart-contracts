import {runEstateSaleSetup} from './estateSaleTestSetup';

describe.only('EstateSaleWithAuth (/packages/land-sale/contracts/EstateSaleWithAuth.sol)', function () {
  it('should deploy the EstateSaleWithAuth contract', async function () {
    const {PolygonLandContract} = await runEstateSaleSetup();
    console.log(PolygonLandContract);
  });
});
