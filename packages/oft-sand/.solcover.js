module.exports = {
  mocha: {
    grep: '@skip-on-coverage', // Find everything with this tag
    invert: true, // Run the grep's inverse set.
  },
  skipFiles: [
    'mocks',
    'libraries/BytesUtil.sol',
    'sand/ERC20BaseToken.sol',
    'sand/WithSuperOperators.sol',
    'sand/WithAdmin.sol',
    'sand/ERC20BasicApproveExtension.sol',
    'sand/ERC2771Handler.sol',
    'oft/OFTCore.sol',
    'oft/OFTAdapter.sol',
  ],
};
