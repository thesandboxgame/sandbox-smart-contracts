import {buildModule} from '@nomicfoundation/hardhat-ignition/modules';

const deployModule = buildModule('deploySand', (m) => {
  const deployer = m.getParameter('deployer');
  const sandAdmin = m.getParameter('sandAdmin');
  const TRUSTED_FORWARDER_V2 = m.getParameter('TRUSTED_FORWARDER_V2');
  const CHILD_CHAIN_MANAGER = m.getParameter('CHILD_CHAIN_MANAGER');
  
  const sand = m.contract('PolygonSand', [CHILD_CHAIN_MANAGER, TRUSTED_FORWARDER_V2, sandAdmin, deployer]);

  return {sand};

});

module.exports = buildModule("SandModule", (m) => {
  const { sand } = m.useModule(deployModule);

  return { sand };
});