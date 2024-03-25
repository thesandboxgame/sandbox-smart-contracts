import {setupEstateSale} from '../fixture';

describe.only('EstateSaleWithAuth', function () {
  it('should be able to purchase a land with valid signature - no bundled assets', async function () {
    await setupEstateSale();
  });
});
