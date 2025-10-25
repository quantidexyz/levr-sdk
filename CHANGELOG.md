# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.3.1](https://github.com/quantidexyz/levr-sdk/compare/v0.3.0...v0.3.1) (2025-10-25)


### Bug Fixes

* update LEVR_TEAM_WALLET address to the new wallet for LP fee allocation ([bbff44e](https://github.com/quantidexyz/levr-sdk/commit/bbff44ea62a5c58d033f7007a46c253cc71ace30))

## [0.3.0](https://github.com/quantidexyz/levr-sdk/compare/v0.2.2...v0.3.0) (2025-10-25)


### Features

* add airdrop functionality with batch claiming and status retrieval, enhancing user experience and contract interactions ([5aad132](https://github.com/quantidexyz/levr-sdk/commit/5aad1322c4fc4d1273c3953b8da296d8d1d074f4))
* add block timestamp handling for accurate stream status and enhance airdrop status with lockup duration ([8c0b361](https://github.com/quantidexyz/levr-sdk/commit/8c0b3612b832a01d348d1473f021480aa64c9639))
* add comprehensive architecture update summary and documentation for data flow verification, refetch analysis, and vote receipt feature ([ca9bbb0](https://github.com/quantidexyz/levr-sdk/commit/ca9bbb085eb606081f615bcf383a0344a4aca356))
* add configureSplits and updateRecipientToSplitter functions for fee splitter management ([e50fbfe](https://github.com/quantidexyz/levr-sdk/commit/e50fbfee5facb6be984434177305ca7a85bd8c13))
* add GET_FEE_SPLITTER_ADDRESS function to retrieve fee splitter address based on chain ID ([7632ec7](https://github.com/quantidexyz/levr-sdk/commit/7632ec711b98fc54ac592851ff45f0cb157fb1c2))
* add governance cycle management to LevrProvider and related hooks, enabling selection and retrieval of proposals based on specified cycles ([655c5bc](https://github.com/quantidexyz/levr-sdk/commit/655c5bc263268db132be07bc62eab06f49d6eade))
* add Levr team LP fee configuration and update reward calculations to include team fee deductions in Clanker rewards ([dcffb50](https://github.com/quantidexyz/levr-sdk/commit/dcffb505b24e5886f13741a051ceb6d3738a1dcf))
* add LevrFeeSplitter_v1 contract and update related ABIs and scripts ([7aef4d4](https://github.com/quantidexyz/levr-sdk/commit/7aef4d4a590958cf1e5295b52db858244ff7cfce))
* add new purchase option of 1.5 ETH to LevrDevBuy schema for enhanced deployment flexibility ([00acb98](https://github.com/quantidexyz/levr-sdk/commit/00acb987be12c1084bfcbaa81a932d5dfa75fd96))
* complete fee splitter integration with comprehensive documentation and updates to project queries ([d48a94e](https://github.com/quantidexyz/levr-sdk/commit/d48a94e7ae4c1869a21b85d634e2f9b79bb9f7fe))
* enhance airdrop functionality with single recipient handling and improve factory configuration by adding maxProposalAmountBps ([0243411](https://github.com/quantidexyz/levr-sdk/commit/0243411d6cf7123c193f3aa2155e56a8b305a4e0))
* enhance Clanker metadata by appending "Deployed on levr.world" to the description for improved clarity ([5d81b9c](https://github.com/quantidexyz/levr-sdk/commit/5d81b9c0f8af03fa37148078dbb6d9e6bf79d685))
* enhance devnet script to retrieve and update FEE_SPLITTER_ADDRESS in environment files ([75dc097](https://github.com/quantidexyz/levr-sdk/commit/75dc09757bd5173aa2b1bedeb44b482ca1816e9d))
* enhance merkle tree storage with metadata support for lockup details, improving airdrop retrieval efficiency and fallback logic ([e94f291](https://github.com/quantidexyz/levr-sdk/commit/e94f2917554f3531d174cbddd97298dd28962df8))
* enhance treasury and staking data retrieval by adding optional WETH balance support and improving cycle ID handling in proposals ([e5e1861](https://github.com/quantidexyz/levr-sdk/commit/e5e186144c7d98baf15b1e8d95a0c203cf5ff4bb))
* enhance vault functionality by introducing vault status management, fetching complete vault data, and implementing hooks for improved token claim handling ([07bb311](https://github.com/quantidexyz/levr-sdk/commit/07bb311131f06de390afcd8fd6e96ed9b1d85cca))
* implement Clanker vault functionality with allocation, claimable amounts, and vesting periods, enhancing token management and user experience ([bdd0d38](https://github.com/quantidexyz/levr-sdk/commit/bdd0d38a8aec198c7d105b4e45a7ca2f5ed34894))
* implement factory configuration retrieval and related hooks, enhancing blockchain interaction and data management in LevrProvider ([6f2161e](https://github.com/quantidexyz/levr-sdk/commit/6f2161e43283b6ee330c1641a305378430ae807c))
* implement fee splitter deployment and retrieval logic, enhancing fee management for Clanker tokens ([c085825](https://github.com/quantidexyz/levr-sdk/commit/c0858258d6a4acbd9cb1450a79312b6d4abefdd7))
* implement fee splitter functionality with static and dynamic data retrieval in project queries ([fae7850](https://github.com/quantidexyz/levr-sdk/commit/fae785081546224e6f8ebedb41aabc13800f6905))
* implement smart flow for configuring splits and updating recipient, optimizing transaction requests based on current state ([93375f9](https://github.com/quantidexyz/levr-sdk/commit/93375f95793721aea0d9ad7b8da1090e5477cde2))
* implement useConfigureSplits hook and add fee splitter configuration schema ([15d3524](https://github.com/quantidexyz/levr-sdk/commit/15d3524f446cbeb1ae221ea994a5c5b2e80a72a2))
* improve project contract handling by tracking token and treasury counts for each project, enhancing result parsing and data retrieval efficiency ([ca2d4cb](https://github.com/quantidexyz/levr-sdk/commit/ca2d4cb772f59c8167360f6f44072be916dc59dc))
* integrate IPFS support for merkle tree storage and retrieval, enhancing airdrop functionality with multi-recipient proof generation ([3772ad8](https://github.com/quantidexyz/levr-sdk/commit/3772ad8540e73e4039130e2f953341fef4d7f0f9))
* integrate publicClient for transaction confirmation in fee receiver updates and splits configuration ([fae55f3](https://github.com/quantidexyz/levr-sdk/commit/fae55f3efc5b67d9d52adc38567b08b570dd1cf3))
* introduce ClankerAirdropV2 ABI and update treasury logic to utilize new airdrop events ([373e93d](https://github.com/quantidexyz/levr-sdk/commit/373e93df6f6a0b41fd9156f79f14ad13fc4a8406))
* overhaul airdrop functionality to support multi-recipient claims, integrate IPFS for merkle tree retrieval, and enhance vault management with new hooks for status and claims ([9c3eb9e](https://github.com/quantidexyz/levr-sdk/commit/9c3eb9e07658a0a7db786358dd9b3e72d9c53524))
* refine staking reward handling and enhance treasury airdrop logic with event definitions ([cc671cb](https://github.com/quantidexyz/levr-sdk/commit/cc671cb8d87b914021972af8f7b0b5c4073bdbc4))
* update devnet script to parse and manage Fee Splitter Deployer address, enhancing environment file updates ([255572a](https://github.com/quantidexyz/levr-sdk/commit/255572ab855f870908d2a9f2fca9d9dac515d5c4))
* update fee splitter address retrieval logic and add integration tests for fee splitter functionality ([58a6679](https://github.com/quantidexyz/levr-sdk/commit/58a6679d76bcc6636c921aa990995491aa0f689b))
* update staking and fee distribution logic to support hybrid setups, allowing simultaneous rewards from both fee splitter and staking contract ([6594c98](https://github.com/quantidexyz/levr-sdk/commit/6594c98906c36802d9d141f130fc7cc4e33628d5))


### Bug Fixes

* refine getMetadata function to handle undefined metadata and ensure social media URLs are only included if present ([4e3d77f](https://github.com/quantidexyz/levr-sdk/commit/4e3d77f541d0937793097b3c9332ad38df7101d0))
* update baseSepolia fee splitter factory address to a hardcoded value for consistency in deployment ([c870524](https://github.com/quantidexyz/levr-sdk/commit/c870524d868d458e75a86efd7216a7bfc8195495))

### [0.2.2](https://github.com/quantidexyz/levr-sdk/compare/v0.2.1...v0.2.2) (2025-10-16)


### Features

* enhance airdrop status retrieval by adding deployment timestamp and optimizing multicall for improved performance ([5b03f2b](https://github.com/quantidexyz/levr-sdk/commit/5b03f2bcf2043aa545a09eef0d5bb40e7eaee2af))
* introduce feePreference enum and enhance fee receiver functionality to support token selection based on preferences ([551109d](https://github.com/quantidexyz/levr-sdk/commit/551109d4c227007a468af2049e230f8f5d873e84))


### Bug Fixes

* change allowFailure to false in multicall execution for improved error handling ([539c895](https://github.com/quantidexyz/levr-sdk/commit/539c895433247c128a6d771924c78c6b62dc0bba))

### [0.2.1](https://github.com/quantidexyz/levr-sdk/compare/v0.2.0...v0.2.1) (2025-10-16)

## [0.2.0](https://github.com/quantidexyz/levr-sdk/compare/v0.1.2...v0.2.0) (2025-10-15)

### Features

- add stream parameters to staking stats for enhanced streaming functionality ([3992327](https://github.com/quantidexyz/levr-sdk/commit/3992327a8d943ffd9138ad70942b24d3ef258a32))
- add tokenDecimals parameter to getUsdPrice function and update related documentation for accurate pricing ([d14d00a](https://github.com/quantidexyz/levr-sdk/commit/d14d00a0cb91d79601bab828c94133ec6086323b))
- consolidate token metadata into project structure by removing useClankerToken hook and updating related documentation for improved efficiency ([ca99a6e](https://github.com/quantidexyz/levr-sdk/commit/ca99a6e95fbf95318f8f2b13f0ba2107c2a901d0))
- enhance airdrop functionality by separating airdrop status retrieval from project data and updating related documentation ([b609299](https://github.com/quantidexyz/levr-sdk/commit/b609299a54d909c6386b7abc7da06a9e7d3390c2))
- implement useAirdropStatus hook for fetching airdrop status and refactor project data fetching to streamline pricing retrieval ([10f773d](https://github.com/quantidexyz/levr-sdk/commit/10f773dcfe71e2c0d070ce7cd89c9c1096e8cf1b))
- integrate airdrop status into LevrProvider and create useAirdropStatus hook for improved airdrop management ([29d9b88](https://github.com/quantidexyz/levr-sdk/commit/29d9b887d1c13bd73f2f530f538b5bcdcd5d818b))
- refactor fee receiver functionality by replacing tokenRewardsBytecode with getFeeReceiverContracts for improved contract call structure and clarity ([1e9265e](https://github.com/quantidexyz/levr-sdk/commit/1e9265eb9a22a474da6c3de6770094573e51e2ce))
- refactor project data fetching to separate static and dynamic data retrieval for improved efficiency ([7fd1f15](https://github.com/quantidexyz/levr-sdk/commit/7fd1f156662bc03e6a4fa36a16f31c128973dba7))
- refactor token rewards functionality by introducing tokenRewardsRead and tokenRewardsBytecode methods for improved contract interaction and deprecating the old getTokenRewards method ([1526851](https://github.com/quantidexyz/levr-sdk/commit/15268512f09ffb4d08d8ee80391798c92be93fb0))
- update V4 quote price impact calculation to use AMM methodology and optimize multicall for performance ([e0d2362](https://github.com/quantidexyz/levr-sdk/commit/e0d2362b7af6b97eb7656cbdf556135ab2637f6e))

### [0.1.2](https://github.com/quantidexyz/levr-sdk/compare/v0.1.1...v0.1.2) (2025-10-14)

### [0.1.1](https://github.com/quantidexyz/levr-sdk/compare/v0.1.0...v0.1.1) (2025-10-14)

## [0.1.0](https://github.com/quantidexyz/levr-sdk/compare/v0.0.2...v0.1.0) (2025-10-14)

### Features

- add pool and user data modules, enhancing project structure with new hooks for efficient data retrieval ([1181c51](https://github.com/quantidexyz/levr-sdk/commit/1181c5105f918bfc9df2ad4f5cd7a73b5f5fff3d))
- add voting power calculations to staking module, including methods for retrieving current voting power and simulating voting power after unstaking ([9f7e66f](https://github.com/quantidexyz/levr-sdk/commit/9f7e66f83b7bb5a3b9b7014a829582e15baa9f31))
- enhance user and project data retrieval by introducing useUser hook and consolidating staking statistics into project queries, improving efficiency and reducing redundant API calls ([5dffda7](https://github.com/quantidexyz/levr-sdk/commit/5dffda7e3c622c920a439d4cce2ea10cea751af9))
- implement zero-duplicate data architecture by consolidating governance data into project queries, reducing RPC calls by 74% and enhancing data retrieval efficiency ([359fff6](https://github.com/quantidexyz/levr-sdk/commit/359fff6ec1cfaabcb15ac0fe380d0302fc608dd4))
- introduce comprehensive data flow cleanup report and test summary, ensuring zero duplicate queries and enhancing architecture verification across server functions, query hooks, and provider layers ([b1a7b55](https://github.com/quantidexyz/levr-sdk/commit/b1a7b55e1bb6111bb229d0e1cec0bd0cf2f18c07))

### Bug Fixes

- update baseSepolia factory address in constants for accurate deployment reference ([0684117](https://github.com/quantidexyz/levr-sdk/commit/06841174b8cbcb3f5a3f85a49c8dcdd8227088b4))

### [0.0.2](https://github.com/quantidexyz/levr-sdk/compare/v0.0.1...v0.0.2) (2025-10-12)

### Features

- add GET_USDC_ADDRESS function and refactor quoteV4 to derive chainId from publicClient ([f537ac2](https://github.com/quantidexyz/levr-sdk/commit/f537ac248d7b8a037b481fc8a27885199d3ebd5c))
- add price impact calculation to quoteV4 and enhance use-swap with pricing data integration ([67fbdcc](https://github.com/quantidexyz/levr-sdk/commit/67fbdccfc827e51f0f26d5546bb137bc4b02b28b))
- add quoteV3 functionality for Uniswap V3 swaps and integrate it into WETH/USD price retrieval, removing deprecated weth-usd module ([1f3c20c](https://github.com/quantidexyz/levr-sdk/commit/1f3c20c1b99489d731dba1931c6910ad73175fc6))
- add Uniswap V3 Quoter V2 integration and enhance WETH/USD price retrieval with improved liquidity checks ([e46903f](https://github.com/quantidexyz/levr-sdk/commit/e46903fc37a9cc78ee3614c0dc65f0f2a4e56884))
- enhance balance and staking modules with optional USD value calculations and integrate pricing data across various components ([012fa48](https://github.com/quantidexyz/levr-sdk/commit/012fa480c5f81f79a4d316cb7426be2d5b31c2c8))
- enhance governance and staking modules with optional USD value calculations and integrate pricing data for treasury stats ([fbbfca8](https://github.com/quantidexyz/levr-sdk/commit/fbbfca8c8346fd795f0b4893c7ee07634f33d3f6))
- enhance README with new USD pricing features, including real-time price impact calculations and integration of pricing data in various SDK functions ([e359961](https://github.com/quantidexyz/levr-sdk/commit/e359961a49299b2b9f00b22811222390fbb751a2))
- implement Uniswap V4 StateView integration and add USD price calculation for tokens paired with WETH ([5fb5280](https://github.com/quantidexyz/levr-sdk/commit/5fb5280cac44d733fe28cd273a3545c2f422c6f0))
- introduce comprehensive documentation for Levr SDK, covering advanced usage patterns, architecture, client hooks, getting started guide, and server API reference ([7c7fdbf](https://github.com/quantidexyz/levr-sdk/commit/7c7fdbfb762a54dfc8330259e7ba169d5001496e))
- refine price impact calculation in quoteV4 and update WETH APR calculation to utilize USD pricing data ([41d8281](https://github.com/quantidexyz/levr-sdk/commit/41d828123e9de2247701964c0ebbec15a0ad3624))
- restructure server API documentation by consolidating query, class, and utility functions into organized sections, enhancing clarity and accessibility for developers ([011a5f0](https://github.com/quantidexyz/levr-sdk/commit/011a5f019f8e70530facbc93866b1436a4583d3e))

### 0.0.1 (2025-10-11)

### Features

- add ADDRESS_THIS and OPEN_DELTA constants in swapV4; enhance deploy-swap tests for automatic WETH unwrapping ([36bf991](https://github.com/quantidexyz/levr-sdk/commit/36bf99193ed1ce2f7d56d67c2c61206d79e4effc))
- add Base Sepolia addresses for various contracts and introduce GET_CLANKER_FACTORY_ADDRESS function for improved address retrieval ([211c77e](https://github.com/quantidexyz/levr-sdk/commit/211c77e2634776ddc36bb93fc64a305f5f8fb70b))
- add claimable rewards functionality and reward rate retrieval for staking and WETH in stake module ([3bd24ec](https://github.com/quantidexyz/levr-sdk/commit/3bd24ec00ae72bc4f91eb698c81eb91c08609e45))
- add deployment tests and utility functions for Clanker SDK integration ([a0ef947](https://github.com/quantidexyz/levr-sdk/commit/a0ef9475d7d87c4e6f14933db3728e3d8be6f9e5))
- add description field to proposals and update governance logic to handle it ([a976c20](https://github.com/quantidexyz/levr-sdk/commit/a976c20e40bd82d33e5813323da63752519a61d2))
- add devnet deployment script and integrate contracts submodule ([040dfdd](https://github.com/quantidexyz/levr-sdk/commit/040dfddba8d58755a86b6d1af7978a73c7a4f321))
- add dynamic and static fee handling in quoteV4 and introduce Clanker hook ABIs ([2fbb893](https://github.com/quantidexyz/levr-sdk/commit/2fbb8938c11adaaaa5b70a831f9ccca7bf123d3b))
- add forwarder support to project and stake modules for enhanced multicall functionality ([5a590f3](https://github.com/quantidexyz/levr-sdk/commit/5a590f30e24c16124fa628d104b96ee72596260d))
- add hook naming convention documentation and refactor hook imports for clarity ([3af79f3](https://github.com/quantidexyz/levr-sdk/commit/3af79f3540237f3ecfe4309e1f6b92292263e54a))
- add IClanker ABIs and deploy-swap tests for Clanker SDK integration ([a1a3395](https://github.com/quantidexyz/levr-sdk/commit/a1a3395c6e26059265eb2b16658a526b42a1c001))
- add imageUrl fetching to useProject and useProjects hooks ([377463f](https://github.com/quantidexyz/levr-sdk/commit/377463f6081e0368274d7a45f1cb14f433786a96))
- add MEV protection error handling in quoteV4 and implement use-swap hook for Uniswap V4 swaps ([43c4f92](https://github.com/quantidexyz/levr-sdk/commit/43c4f92c0fb45899290bd9199401b1d17df391e7))
- add new functions and error types to LevrForwarder_v1 ABI for enhanced contract interactions ([0ee1948](https://github.com/quantidexyz/levr-sdk/commit/0ee194831c12ee59c12bcc279b9e8554d5a8a105))
- add new functions and error types to LevrGovernor and LevrStaking ABIs for enhanced governance and staking functionality ([25c0d33](https://github.com/quantidexyz/levr-sdk/commit/25c0d33bd34e650f2364500b37f4f76d0e997c23))
- add project and projects modules for handling project data retrieval and management ([992d0b3](https://github.com/quantidexyz/levr-sdk/commit/992d0b35b44736374239787b81175ca8d7c46877))
- add script to update ABIs from contract JSON files and integrate into package.json ([2846e2d](https://github.com/quantidexyz/levr-sdk/commit/2846e2dce7407c277af7f0164feee7086925b193))
- add staking functionality with StakeService and integrate into useStake hook ([8681876](https://github.com/quantidexyz/levr-sdk/commit/86818761eeb5037bfaf8d22dbcd1ce706e0dfa9e))
- add useBalance hook for fetching token and staked balances ([04bcb71](https://github.com/quantidexyz/levr-sdk/commit/04bcb7166549407fe848321e7e9f03605f1defac))
- add useProjects hook for fetching project data and update index export ([9774c52](https://github.com/quantidexyz/levr-sdk/commit/9774c52bb574487a25e7a18b6802c7a0543be23c))
- add utility functions for LP locker, factory, and WETH addresses; enhance hooks with parameter types ([a84d42e](https://github.com/quantidexyz/levr-sdk/commit/a84d42e8749439aa9ba50ad8b7e8bf431204f227))
- add WETH reward rate and APR queries to staking hooks and LevrProvider for enhanced staking functionality ([1f68084](https://github.com/quantidexyz/levr-sdk/commit/1f68084d184d04b6d173587fef3922bb945ad1b3))
- clarify WETH handling in swapV4 and enable deploy-swap test for execution flow ([eae898f](https://github.com/quantidexyz/levr-sdk/commit/eae898f459e226ead55d8f553d886809f721eddf))
- enhance buildCalldatasV4 to support ETH forwarding and update related ABIs ([7c3d5fa](https://github.com/quantidexyz/levr-sdk/commit/7c3d5fafda3cb7cfc2fa9e845d0fa0a42abc23d0))
- enhance getUserData method to include WETH APR and update LevrStaking_v1 ABI for token input ([19a0e01](https://github.com/quantidexyz/levr-sdk/commit/19a0e0188661ea846f4137c3b4d15f6271aea33a))
- enhance governance and project modules with treasury stats and proposals management ([e75eb3e](https://github.com/quantidexyz/levr-sdk/commit/e75eb3ea039335b855a86c7f81464bf1f66dae8b))
- enhance LevrFactory and LevrStaking ABIs with new functions; add comprehensive swap tests for ETH and token interactions ([8b888e0](https://github.com/quantidexyz/levr-sdk/commit/8b888e0b57d6cf795c57bfb5a8a185cad23d7ec7))
- enhance swapV4 with Uniswap SDK integration and improve deploy-swap tests for ETH handling ([cb3baa7](https://github.com/quantidexyz/levr-sdk/commit/cb3baa7fcf3a49380cee9602b4f4657dbbf8d4e1))
- enhance swapV4 with WETH unwrapping logic and improve deploy-swap tests for quote handling ([adcdc0e](https://github.com/quantidexyz/levr-sdk/commit/adcdc0e1b9ca840fb40aba34f9115e23d2a58e93))
- enhance treasury airdrop allocation detection using multicall for improved efficiency and error handling ([3ff24ca](https://github.com/quantidexyz/levr-sdk/commit/3ff24ca6153a33b836a0c36414d3583d8359efc2))
- enhance useBalance hook for multiple token support and improve useStake integration ([62c64ac](https://github.com/quantidexyz/levr-sdk/commit/62c64ac61c4aae173a874826bac20d7a2497cf9e))
- enhance useStake hook with approval handling and allowance query ([ec7bb02](https://github.com/quantidexyz/levr-sdk/commit/ec7bb020dd95d0df15a8d0f5f91167c5ce80109d))
- implement balance retrieval for multiple tokens and enhance swapV4 with approval callbacks ([fd48524](https://github.com/quantidexyz/levr-sdk/commit/fd48524b0652a26c199a475e5e542444a565523f))
- implement deployV4 function for Clanker SDK integration and update useDeploy hook ([58e2a7e](https://github.com/quantidexyz/levr-sdk/commit/58e2a7ec72aaa757e8436f0fd44b01a2c062aad9))
- implement governance module with proposal management and execution functionality ([a7ede39](https://github.com/quantidexyz/levr-sdk/commit/a7ede392c67effb4d0f9df52252f3f04f94cf5d5))
- implement MSG_SENDER constant in swapV4 and enhance deploy-swap tests for quote and execution flow ([dfc1503](https://github.com/quantidexyz/levr-sdk/commit/dfc15037d9e7aa5ea8531ff3a0e6e69a25a39dba))
- implement treasury airdrop functionality with allocation checks and claim support ([16a1a2c](https://github.com/quantidexyz/levr-sdk/commit/16a1a2c5a25962be8f58caac1f0b19086349220f))
- implement Uniswap V4 quote and swap functionality with new quote-v4 and swap-v4 modules ([a0259e2](https://github.com/quantidexyz/levr-sdk/commit/a0259e25cd9bd937054a0efc778a6935746a1475))
- improve useStake hook with auto-refetch on success and enhanced allowance handling ([be86535](https://github.com/quantidexyz/levr-sdk/commit/be86535ef606ecc0bc1c8a4565ad213da8a589c5))
- integrate forwarder address into buildCalldatasV4 and deployV4 functions, update governance tests for complete cycle validation ([6293694](https://github.com/quantidexyz/levr-sdk/commit/6293694fe04c89c808df3ad18c9ec2c05527a9d5))
- integrate Permit2 for ERC20 approvals in swap-v4 and enhance deploy-swap tests for reverse swaps ([64562d1](https://github.com/quantidexyz/levr-sdk/commit/64562d16a9f1b1ab768d7e77692c057ac5631684))
- integrate Uniswap V4 SDK and add PoolManager and V4Quoter ABIs ([c6b7ab1](https://github.com/quantidexyz/levr-sdk/commit/c6b7ab11301621c82d4a1de7d6197e5e838027ec))
- introduce LevrProvider and query keys for centralized management of blockchain queries and context ([44e4acb](https://github.com/quantidexyz/levr-sdk/commit/44e4acbf18da0a61b84f2e822c85ca8c30cdb25f))
- introduce static fee tiers and integrate into Levr schema for enhanced fee management ([c2b514a](https://github.com/quantidexyz/levr-sdk/commit/c2b514ade0a1f82047685c8499bd6797da0d5950))
- introduce WETH ABI and enhance swapV4 with constant definitions for improved ETH handling ([8098bad](https://github.com/quantidexyz/levr-sdk/commit/8098bad88ddf71743427e3723e10d275d645ee61))
- optimize fee retrieval and balance checks using multicall in quoteV4 and swapV4 ([763a695](https://github.com/quantidexyz/levr-sdk/commit/763a695c1aeead0c0f9f86a5cc6640c7a1daeb2c))
- refactor deploy-swap tests for improved setup and introduce helper functions for token rewards ([d1ae62f](https://github.com/quantidexyz/levr-sdk/commit/d1ae62ff2f9cab1457f54a3e7e4cfeb9b14e2ec6))
- refine swapV4 logic for WETH handling and update deploy-swap tests for clarity in swap directions ([4080351](https://github.com/quantidexyz/levr-sdk/commit/408035129ea95101ad4a1e327398d3f146b507a9))
- update governance module with new proposal structure, voting functionality, and cycle management ([bead786](https://github.com/quantidexyz/levr-sdk/commit/bead7869b813aee603ff8345f232ff75489c1a31))
- update project.ts to integrate LP locker functionality and enhance pool information extraction ([bd7cc1c](https://github.com/quantidexyz/levr-sdk/commit/bd7cc1c6e50ef48c340031ebfd06d9adc5b4557f))
- update README.md to introduce Levr SDK, enhance installation instructions, and provide detailed usage examples for client and server-side operations ([e11e3c5](https://github.com/quantidexyz/levr-sdk/commit/e11e3c5076f03a135725cd6c451b2003932d188a))
- update swapV4 for improved constant definitions and enhance deploy-swap tests for balance verification and clarity ([bcb0aa5](https://github.com/quantidexyz/levr-sdk/commit/bcb0aa5cb75ecadf7514650c35e6b79ec7f0aa82))
- update swapV4 to return TransactionReceipt and enhance deploy-swap tests for receipt validation ([b266467](https://github.com/quantidexyz/levr-sdk/commit/b26646789aeca9e4a629475b31690a0125c1132a))
- update treasury airdrop amounts structure and default values for deployment functions ([c94f6b1](https://github.com/quantidexyz/levr-sdk/commit/c94f6b10d817ea0f32b53d7a642ba56e5ac3422e))

### Bug Fixes

- add missing newline at the end of use-deploy.ts file ([2e8cc6a](https://github.com/quantidexyz/levr-sdk/commit/2e8cc6ac969e61a739961a5949afc0033029238e))
- remove console error for wallet connection and update approval check to include token decimals ([127f2c4](https://github.com/quantidexyz/levr-sdk/commit/127f2c46090983d7887d944df4370f83906dd0dc))
- update Base Sepolia factory address to the correct value for accurate address retrieval ([550548f](https://github.com/quantidexyz/levr-sdk/commit/550548f41edfeaebb3b931b0e6180d8be0ee03e9))
