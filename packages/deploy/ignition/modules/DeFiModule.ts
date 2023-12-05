import {buildModule} from '@nomicfoundation/hardhat-ignition/modules';

const deployPool = buildModule('deployPool', (m) => {
  const sand = m.getParameter('PolygonSand');
  const TRUSTED_FORWARDER_V2 = m.getParameter('TRUSTED_FORWARDER_V2');
  const lockPeriodInSecs = 604800;
  const amountLockClaim = 0;
  const isEnabled = false;

  
  const pool = m.contract('ERC20RewardPoolV2', [sand, sand, TRUSTED_FORWARDER_V2]);

  m.call(pool,'setTimelockClaim', [lockPeriodInSecs] );
  m.call(pool,'setTimelockDeposit', [lockPeriodInSecs] );
  m.call(pool,'setTimeLockWithdraw', [lockPeriodInSecs] );
  m.call(pool,'setAmountLockClaim', [amountLockClaim, isEnabled] );

  return {pool};

});

const deployRewardCalculator = buildModule('deployRewardCalculator', (m) => {
  const { pool } = m.useModule(deployPool);

  const rewardCalculator = m.contract('TwoPeriodsRewardCalculatorV2', [pool]);

  return {rewardCalculator};

});

const deployContributionRules = buildModule('deployContributionRules', (m) => {
  
  const contributionRules = m.contract('ContributionRulesV2', []);

  return {contributionRules};

  // configuration stuff

});

module.exports = buildModule("DeFiModule", (m) => {
  const { pool } = m.useModule(deployPool);
  const { rewardCalculator } = m.useModule(deployRewardCalculator);
  const { contributionRules } = m.useModule(deployContributionRules);

  return { pool, rewardCalculator, contributionRules };
});