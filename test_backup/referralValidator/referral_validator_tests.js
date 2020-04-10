const tap = require('tap');
const assert = require('assert');
const {deployments, namedAccounts} = require('@nomiclabs/buidler');
const {BigNumber} = require('ethers');

const {
    call,
    tx,
    deployContract,
    expectRevert,
    gas,
    zeroAddress,
    increaseTime,
    mine,
    toWei,
} = require('../../test/utils');

const {
    deployer,
    others,
} = namedAccounts;

const {
    createReferral,
} = require('../../lib/referralValidator');

const maxCommissionRate = '2000';
const signer = '0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3';
const privateKey = '0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177';

const newSigner = '0xD1Df0BB44804f4Ac75286E9b1AE66c27CBCb5c7C';
const newPrivateKey = '0x7acc5878579a9f8e41e61d3e02c6a8d71740226c5d80706be35640790a40ff75';

const referralLinkValidity = 60 * 60 * 24 * 30;
const previousSigningDelay = 60 * 60 * 24 * 10;

function runReferralValidatorTests(title) {
    tap.test(title + ' tests', async (t) => {
        let referralValidator;

        t.beforeEach(async () => {
            referralValidator = await deployContract(deployer, 'ReferralValidator', signer, maxCommissionRate);
        });

        t.test('can verify a valid referral', async () => {
            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '500',
            };

            const sig = createReferral(
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
            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '2100',
            };

            const sig = createReferral(
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

            assert.equal(isValid, false, 'Referral should not be valid');
        });

        t.test('can reject an expired referral', async () => {
            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) - (60 * 60),
                commissionRate: '500',
            };

            const sig = createReferral(
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

            assert.equal(isValid, false, 'Referral should not be valid');
        });

        t.test('can reject a self referral', async () => {
            const referral = {
                referrer: others[0],
                referee: others[0],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '500',
            };

            const sig = createReferral(
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

            assert.equal(isValid, false, 'Referral should not be valid');
        });

        t.test('can reject a modified referral', async () => {
            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '500',
            };

            const sig = createReferral(
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
                '1000',
            );

            assert.equal(isValid, false, 'Referral should not be valid');
        });

        t.test('can reject a referral not signed by us', async () => {
            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '500',
            };

            const sig = createReferral(
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

        t.test('can update the signing wallet', async () => {
            await tx(
                referralValidator,
                'updateSigningWallet', {
                    from: deployer,
                    gas,
                },
                newSigner,
            );
        });

        t.test('cannot update the signing wallet if not admin', async () => {
            await expectRevert(
                tx(
                    referralValidator,
                    'updateSigningWallet', {
                        from: others[0],
                        gas,
                    },
                    newSigner,
                ),
                'Sender not admin',
            );
        });

        t.test('can update the signing wallet and verify a new referral', async () => {
            await tx(
                referralValidator,
                'updateSigningWallet', {
                    from: deployer,
                    gas,
                },
                newSigner,
            );

            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '500',
            };

            const sig = createReferral(
                newPrivateKey,
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

        t.test('can update the signing wallet and verify an old referral', async () => {
            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '500',
            };

            const sig = createReferral(
                privateKey,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            await tx(
                referralValidator,
                'updateSigningWallet', {
                    from: deployer,
                    gas,
                },
                newSigner,
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

        t.test('can update the signing wallet and reject an old referral', async () => {
            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '500',
            };

            const sig = createReferral(
                privateKey,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            await tx(
                referralValidator,
                'updateSigningWallet', {
                    from: deployer,
                    gas,
                },
                newSigner,
            );

            await increaseTime(previousSigningDelay * 2);
            await mine();

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

        /*
        t.test('can record a referral', async () => {
            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '500',
            };

            const sig = createReferral(
                privateKey,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            const receipt = await tx(
                referralValidator,
                'recordReferral', {
                    from: others[0],
                    gas,
                },
                toWei('1'),
                sig.signature,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            const event = receipt.events.ReferralUsed;

            const {
                referrer,
                referee,
                ETHRequired,
                commission,
                commissionRate,
            } = event.returnValues;

            assert.equal(referrer, referral.referrer, 'Referrer is wrong');
            assert.equal(referee, referral.referee, 'Referee is wrong');
            assert.equal(ETHRequired, toWei('1'), 'ETHRequired is wrong');
            assert.equal(commission, new BN(toWei('1')).mul(new BN(commissionRate)).div(new BN(10000)), 'Commission is wrong');
            assert.equal(commissionRate, referral.commissionRate, 'Commission rate is wrong');
        });

        t.test('can skip a referral', async () => {
            const referral = {
                referrer: others[0],
                referee: others[1],
                expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                commissionRate: '500',
            };

            const sig = createReferral(
                privateKey,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                referral.commissionRate,
            );

            const receipt = await tx(
                referralValidator,
                'recordReferral', {
                    from: others[0],
                    gas,
                },
                toWei('1'),
                sig.signature,
                referral.referrer,
                referral.referee,
                referral.expiryTime,
                '1000',
            );

            assert.equal(Object.keys(receipt.events).length, 0, 'Event is wrong');
        });
        */
    });
}

module.exports = {
    runReferralValidatorTests,
};
