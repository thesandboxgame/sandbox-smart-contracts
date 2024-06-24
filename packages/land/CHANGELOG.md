# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc.1] - 2024-05-28

### Changed

- Use 15 bits for land neighborhood id in the metadata registry.

## [1.0.0-rc.0] - 2024-05-17

### Added

- Land and PolygonLand implemented in the new `land` package
- A lot of common code reused (see: `LandBase`) and two mixins to support the
  storage slots specifics
- Royalties (EIP2981 support
- Metadata registry support (neighborhood + premiumness on chain)
- Upgraded solc version to 0.8.23, use custom errors, contract size reduction
- Pre-audit fixed

## [0.0.3] - 2024-01-25

### Added

- Land and PolygonLand contracts taken from `core` package with no functional
  modifications.
- Fix linter issues.
- Use `hardhat-toolbox`instead of `hardhat-deploy` plugin for unit testing.
- First official version using release-it.

## [0.0.2] - 2024-01-01

### Added

- Initial version.
