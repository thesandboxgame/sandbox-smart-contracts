import {buildModule} from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('SandModule', (m) => {
  const deployer = m.getParameter('deployer');
  const sandAdmin = m.getParameter('sandAdmin');
  const sandExecutionAdmin = m.getParameter('sandExecutionAdmin');
  const TRUSTED_FORWARDER_V2 = m.getParameter('TRUSTED_FORWARDER_V2');
  const CHILD_CHAIN_MANAGER = m.getParameter('CHILD_CHAIN_MANAGER');
  
  const splitter = m.contract('PolygonSand', [CHILD_CHAIN_MANAGER, TRUSTED_FORWARDER_V2, sandAdmin, deployer]);

  return {splitter};
});
