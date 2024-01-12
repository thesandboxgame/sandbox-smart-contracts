# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Fix: Catalyst contract transfer method patch.

## [1.0.3] - 2023-12-04

- move `@manifoldxyz/*` from devDependencies to dependencies

## [1.0.2] - 2023-10-20

- Update dependencies in package.json

## [1.0.1] - 2023-10-06

- first official version using release-it
- updates to readme
- fixes to changelog

## [1.0.0] - 2023-10-06

- as of this date we have deployed Catalyst, OperatorFilterSubscription,
  RoyaltyManager, RoyaltySplitter on Polygon-mainnet (note: Asset, AssetCreate,
  AssetReveal, AuthSuperValidator have not been deployed on Polygon-mainnet yet)
- move @openzeppelin contracts to dependencies (instead of dev deps)
- release-it and release-it hooks added
