const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const Web3 = require('web3');

const {
    call,
    deployContract,
    expectRevert,
} = require('../utils');

const {
    deployer,
    others,
} = rocketh.namedAccounts;

const {
    createReferral,
} = require('../../lib/referralValidator');

const signer = '0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3';
const privateKey = '0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177';

const referralLinkValidity = 60 * 60 * 24 * 30;

function runReferralValidatorTests(title) {
    tap.test(title + ' tests', async (t) => {
        let referralValidator;

        t.beforeEach(async () => {
            referralValidator = await deployContract(deployer, 'ReferralValidator', signer);
        });

        t.test('can verify a valid referral', async () => {
            const web3 = new Web3();
            web3.setProvider(rocketh.ethereum);

            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '5',
            };

            const sig = createReferral(
                web3,
                privateKey,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            const isValid = await call(
                referralValidator, 'isReferralValid', {
                    from: others[0],
                },
                sig.signature,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            assert.equal(isValid, true, 'Referral should be valid');
        });

        t.test('can reject a referral with an invalid rate', async () => {
            const web3 = new Web3();
            web3.setProvider(rocketh.ethereum);

            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '21',
            };

            const sig = createReferral(
                web3,
                privateKey,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            await expectRevert(
                call(
                    referralValidator, 'isReferralValid', {
                        from: others[0],
                    },
                    sig.signature,
                    referral.referrer,
                    referral.referee,
                    referral.expiryTime,
                    referral.commissionRate,
                ),
                'Invalid rate',
            );
        });

        t.test('can reject an expired referral', async () => {
            const web3 = new Web3();
            web3.setProvider(rocketh.ethereum);

            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000),
                commissionRate: '5',
            };

            const sig = createReferral(
                web3,
                privateKey,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            await expectRevert(
                call(
                    referralValidator, 'isReferralValid', {
                        from: others[0],
                    },
                    sig.signature,
                    referral.referrer,
                    referral.referee,
                    referral.expiryTime,
                    referral.commissionRate,
                ),
                'Expired',
            );
        });

        t.test('can reject a self referral', async () => {
            const web3 = new Web3();
            web3.setProvider(rocketh.ethereum);

            const referral = {
                referrer: others[0],
                referee: others[0],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '5',
            };

            const sig = createReferral(
                web3,
                privateKey,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            await expectRevert(
                call(
                    referralValidator, 'isReferralValid', {
                        from: others[0],
                    },
                    sig.signature,
                    referral.referrer,
                    referral.referee,
                    referral.expiryTime,
                    referral.commissionRate,
                ),
                'Invalid referee',
            );
        });

        t.test('can reject a modified referral', async () => {
            const web3 = new Web3();
            web3.setProvider(rocketh.ethereum);

            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '5',
            };

            const sig = createReferral(
                web3,
                privateKey,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            const isValid = await call(
                referralValidator, 'isReferralValid', {
                    from: others[0],
                },
                sig.signature,
                referral.referrer,
                others[2],
                referral.expiryTime,
                '10',
            );

            assert.equal(isValid, false, 'Referral should not be valid');
        });

        t.test('can reject a referral not signed by us', async () => {
            const web3 = new Web3();
            web3.setProvider(rocketh.ethereum);

            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '5',
            };

            const sig = createReferral(
                web3,
                '0x489b4572c75177cc72eb2cca619affa1c8473a334540b312e044393a257266d6',
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            const isValid = await call(
                referralValidator, 'isReferralValid', {
                    from: others[0],
                },
                sig.signature,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            assert.equal(isValid, false, 'Referral should not be valid');
        });
    });
}

module.exports = {
    runReferralValidatorTests,
};
