# KeyBirdy
A Thunderbird extension to enable Blind Trust Before Verification for OpenPGP.

**Status: Proof of Concept / WIP**

![screenshot](https://raw.githubusercontent.com/nebulak/keybirdy/master/docs/screenshots/compose.png "Screenshot of compose window")



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


# Development

## Build instructions

The extension can be built with *ant*. Open a new terminal in the main directory and execute *ant*.

## Notes

The openpgp.js library is modified to work in thunderbird. The only modification is the use of a fake LocalStorage, because Thunderbird does not support LocalStorage.

### Credits

Some parts of the code are taken from keys4all/keys4all.de, which is an Proof of Concept thunderbird extension for automatic key discovery/import, secured with DNSSEC/DANE.
I worked as a part-time software developer at Fraunhofer SIT for the development of the Keys4All-Addon.

### License
GPLv3
