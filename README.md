# KeyBirdy
A Thunderbird extension to enable Blind Trust Before Verification for OpenPGP.
Status: WIP





# Goals

  * Automatic discovery of OpenPGP keys of your recipients with email-verifying keyservers
& Web Key Directories.
  * Easy key verification with magic wormhole
  * Blind Trust Before Verification
  * Easy to use for new users

## Milestones

### 0.1 Basic Implementation

  - [x] Automatic key import from WKD & keys.openpgp.org
  - [ ] Sidebar in compose window
    - [x] Show key import status for each recipient(WKD, Keyserver, Local, None)
    - [ ] Show if message encryption is possible
  - [ ] Improve key search performance
    - [ ] use IntervallTimer
    - [ ] check if a keysearch is already running
  - [ ] Refactoring
  - [ ] Documentation



