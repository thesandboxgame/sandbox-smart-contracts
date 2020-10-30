const {utils} = require("ethers");
const {assert} = require("local-chai");
const {setupStarterPack} = require("./subTests/fixtures");
const {expectRevert} = require("local-utils");
const {privateKey} = require("./subTests/_testHelper");
const {signPurchaseMessage} = require("../../lib/purchaseMessageSigner");
const {getNamedAccounts} = require("@nomiclabs/buidler");

const getPackedNonce = (nonce, queueId) => {
  const paddedNonce = utils.hexZeroPad(utils.hexValue(nonce), 16).replace(/0x/, "");
  const hexQueueID = utils.hexZeroPad(utils.hexValue(queueId), 16);
  const concatedNonce = hexQueueID.concat(paddedNonce);
  return concatedNonce;
};

describe("PurchaseValidator", function () {
  let starterPack;
  let roles;
  let buyer;
  let Message;

  const message = {
    catalystIds: [0, 1, 2, 3],
    catalystQuantities: [1, 1, 1, 1],
    gemIds: [0, 1, 2, 3, 4],
    gemQuantities: [2, 2, 2, 2, 2],
    nonce: 0,
  };

  beforeEach(async function () {
    ({starterPackContract: starterPack} = await setupStarterPack());
    roles = await getNamedAccounts();
    buyer = roles.others[0];
    Message = {...message};
  });
  describe("Validation", function () {
    it("Purchase validator function works", async function () {
      Message.buyer = roles.others[1];
      const dummySignature = signPurchaseMessage(privateKey, Message, buyer);
      assert.ok(
        await starterPack.isPurchaseValid(
          buyer,
          Message.catalystIds,
          Message.catalystQuantities,
          Message.gemIds,
          Message.gemQuantities,
          Message.nonce,
          dummySignature
        )
      );
    });

    it("the order of catalystIds shouldn't matter", async function () {
      Message.catalystIds = [2, 3, 0, 1];
      Message.gemQuantities = [0, 0, 1, 1, 0];
      let dummySignature = signPurchaseMessage(privateKey, Message, buyer);
      assert.ok(
        await starterPack.isPurchaseValid(
          buyer,
          Message.catalystIds,
          Message.catalystQuantities,
          Message.gemIds,
          Message.gemQuantities,
          Message.nonce,
          dummySignature
        )
      );

      Message.catalystIds = [3, 2, 1, 0];
      Message.catalystQuantities = [2, 1, 0, 3];
      Message.gemQuantities = [5, 2, 3, 1, 3];
      dummySignature = signPurchaseMessage(privateKey, Message, buyer);
      assert.ok(
        await starterPack.isPurchaseValid(
          buyer,
          Message.catalystIds,
          Message.catalystQuantities,
          Message.gemIds,
          Message.gemQuantities,
          Message.nonce + 1,
          dummySignature
        )
      );
    });

    it("the order of gemIds shouldn't matter", async function () {
      Message.gemIds = [3, 4, 0, 2, 1];
      const dummySignature = signPurchaseMessage(privateKey, Message, buyer);
      assert.ok(
        await starterPack.isPurchaseValid(
          buyer,
          Message.catalystIds,
          Message.catalystQuantities,
          Message.gemIds,
          Message.gemQuantities,
          Message.nonce,
          dummySignature
        )
      );
    });

    it("Should be possible to get the nonce for a buyer", async function () {
      // default queueId (0)
      let nonce = await starterPack.getNonceByBuyer(buyer, 0);
      assert.equal(nonce, 0);
      // queueId (7)
      nonce = await starterPack.getNonceByBuyer(buyer, 7);
      assert.equal(nonce, 0);
    });

    it("should allow the use of multiple nonce queues", async function () {
      // To get the nonce, we simply pass the buyer address & queueID
      let nonceForqueueId0 = await starterPack.getNonceByBuyer(buyer, 0);
      let nonceForqueueId454 = await starterPack.getNonceByBuyer(buyer, 454);
      assert.equal(nonceForqueueId0, 0);
      assert.equal(nonceForqueueId454, 0);
      // for the default queueId=0, we can just pass the nonce
      Message.nonce = nonceForqueueId0;
      let dummySignature = signPurchaseMessage(privateKey, Message, buyer);
      assert.ok(
        await starterPack.isPurchaseValid(
          buyer,
          Message.catalystIds,
          Message.catalystQuantities,
          Message.gemIds,
          Message.gemQuantities,
          Message.nonce, // 0 (0x000...000)
          dummySignature
        )
      );

      let nonce = 0;
      let queueId = 454;
      // for any other queueId, we need to pack the values
      Message.nonce = getPackedNonce(nonce, queueId);
      dummySignature = signPurchaseMessage(privateKey, Message, buyer);
      assert.ok(
        await starterPack.isPurchaseValid(
          buyer,
          Message.catalystIds,
          Message.catalystQuantities,
          Message.gemIds,
          Message.gemQuantities,
          Message.nonce,
          dummySignature
        )
      );
      // Now we can simply increment the nonce in the new queue
      nonce++;
      Message.nonce = getPackedNonce(nonce, queueId); // 0x000000000000000000000000000001c600000000000000000000000000000001
      dummySignature = signPurchaseMessage(privateKey, Message, buyer);
      assert.ok(
        await starterPack.isPurchaseValid(
          buyer,
          Message.catalystIds,
          Message.catalystQuantities,
          Message.gemIds,
          Message.gemQuantities,
          Message.nonce,
          dummySignature
        )
      );
    });

    it("Should be possible to get the signing wallet", async function () {
      const {backendMessageSigner} = await getNamedAccounts();
      const wallet = await starterPack.getSigningWallet();
      assert.equal(wallet, backendMessageSigner);
    });

    it("Should be possible for Admin to update the signing wallet", async function () {
      const {starterPackContractAsAdmin: starterPackAsAdmin} = await setupStarterPack();
      const newSigner = roles.others[1];
      await starterPackAsAdmin.updateSigningWallet(newSigner);
      const wallet = await starterPackAsAdmin.getSigningWallet();
      assert.equal(wallet, newSigner);
    });
  });

  describe("Failures", function () {
    it("should fail if the nonce is re-used", async function () {
      ({starterPackContract: starterPack} = await setupStarterPack());
      const dummySignature = signPurchaseMessage(privateKey, Message, buyer);
      assert.ok(
        await starterPack.isPurchaseValid(
          buyer,
          Message.catalystIds,
          Message.catalystQuantities,
          Message.gemIds,
          Message.gemQuantities,
          Message.nonce,
          dummySignature
        )
      );

      await expectRevert(
        starterPack.isPurchaseValid(
          buyer,
          Message.catalystIds,
          Message.catalystQuantities,
          Message.gemIds,
          Message.gemQuantities,
          Message.nonce,
          dummySignature
        ),
        "INVALID_NONCE"
      );
    });

    it("Should fail if anyone but Admin tries to update signing wallet", async function () {
      const newSigner = roles.others[0];
      await expectRevert(starterPack.updateSigningWallet(newSigner), "SENDER_NOT_ADMIN");
    });
  });
});
