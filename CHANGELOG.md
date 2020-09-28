### v5.0.0 (2020-09-28)

#### Pull requests

- [#29](https://github.com/gustavnikolaj/hijackresponse/pull/29) Use an actual Proxy to create proxyRes ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [#30](https://github.com/gustavnikolaj/hijackresponse/pull/30) Proof of concept of promise API ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [#24](https://github.com/gustavnikolaj/hijackresponse/pull/24) Split stream rewrite ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [#21](https://github.com/gustavnikolaj/hijackresponse/pull/21) Supporting node.js v12 ([Gustav Nikolaj Olsen](mailto:gno@one.com))

#### Commits to master

- [Update example and add API docs](https://github.com/gustavnikolaj/hijackresponse/commit/942a00577a4f71a1689f6037c020fed0fd620c9d) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [Setup automatic changelog generation](https://github.com/gustavnikolaj/hijackresponse/commit/94a197ff519d933ae5fa01916e33785d93ab98cf) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [Use a Symbol for marking hijacked responses](https://github.com/gustavnikolaj/hijackresponse/commit/d41a83bb570fff9a66236f98e23f6c8a5650fb15) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [5.0.0-rc.2](https://github.com/gustavnikolaj/hijackresponse/commit/2f4f1c308774d84c7b2c3c14ca0f35cd096053f1) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [Add jsdoc comments to hijackResponse function](https://github.com/gustavnikolaj/hijackresponse/commit/55bad0747c7b4522fd901d9c1a7dc991793a23e3) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [+31 more](https://github.com/gustavnikolaj/hijackresponse/compare/v4.0.1...v5.0.0)

### v4.0.1 (2020-09-14)

#### Pull requests

- [#18](https://github.com/gustavnikolaj/hijackresponse/pull/18) Whitelist package contents ([Matthias Kunnen](mailto:matthias.kunnen@gmail.com))

#### Commits to master

- [Update code formatting](https://github.com/gustavnikolaj/hijackresponse/commit/91f7f6ac82312632a8f58f528f28d040eb9d0082) ([Gustav Nikolaj Olsen](mailto:gno@one.com))

### v4.0.0 (2019-03-04)

- [Remove warning on being untested on node 8 and above](https://github.com/gustavnikolaj/hijackresponse/commit/55bceb85cf27f2f9d9fbb9ea38325276ef6e6303) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [Test on node 6, 8 and 10](https://github.com/gustavnikolaj/hijackresponse/commit/5a7f6391389770a04669756643aeb03e12aa3d87) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [Make sure emit gets copied over](https://github.com/gustavnikolaj/hijackresponse/commit/1d587ca2519ad8fbd29527dc16689811a09691b0) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [Trim editorconfig](https://github.com/gustavnikolaj/hijackresponse/commit/3d5b3736b25917bf0f49c921058f615f80baecdd) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [Replace istanbul with nyc](https://github.com/gustavnikolaj/hijackresponse/commit/8a59f4bd5a481b91823c504bc7ca9cf18bf57382) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [+13 more](https://github.com/gustavnikolaj/hijackresponse/compare/v3.0.0...v4.0.0)

### v3.0.0 (2017-04-25)

- [fix handling of status messages in res.writeHead \(\#13\) \(fixes \#12\)](https://github.com/gustavnikolaj/hijackresponse/commit/55631c7993baef698d8797b4c286f6879ca7d744) ([Gustav Nikolaj](mailto:gustavnikolaj@gmail.com))

### v2.0.1 (2016-12-02)

#### Pull requests

- [#11](https://github.com/gustavnikolaj/hijackresponse/pull/11) Preserving "close" Event Listeners On Response ([Pablo Sichert](mailto:mail@pablosichert.de))

#### Commits to master

- [Travis: Drop node.js 0.10 support, add 6 and 7 instead.](https://github.com/gustavnikolaj/hijackresponse/commit/a6fba84754b32bdb5a69a370a9aad1ce02ae27b5) ([Andreas Lind](mailto:andreas@one.com))

### v2.0.0 (2016-08-05)

- [remove backpressure support \(ref \#10\)](https://github.com/gustavnikolaj/hijackresponse/commit/000717c70543b362be85368c38522275c2032d5e) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [accept that the unchunked body is either an empty buffer or undefined](https://github.com/gustavnikolaj/hijackresponse/commit/4bb1eb842e2358a27c8ca7fa9360917d0fd7dc66) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [fix lint errors](https://github.com/gustavnikolaj/hijackresponse/commit/cb8b349792d532ac66892d46a2c0ee3d8cf4f939) ([Gustav Nikolaj Olsen](mailto:gno@one.com))

### v1.1.0 (2016-04-15)

#### Pull requests

- [#7](https://github.com/gustavnikolaj/hijackresponse/pull/7) set right string name ([Holger Schauf](mailto:holger.schauf@googlemail.com))
- [#6](https://github.com/gustavnikolaj/hijackresponse/pull/6) Wrong Regex ([Holger Schauf](mailto:holger.schauf@googlemail.com))

#### Commits to master

- [Consolidate with fix\/nobackpressure by introducing a disableBackpressure option.](https://github.com/gustavnikolaj/hijackresponse/commit/1a862faee84c6bd8c304ab5e71553c4a7088652e) ([Andreas Lind](mailto:andreas@one.com))
- [Added failing test \[ci skip\].](https://github.com/gustavnikolaj/hijackresponse/commit/e703ef5377134446f1e2c05f310a34926428611b) ([Andreas Lind](mailto:andreas@one.com))
- [Implement .destroyHijacked method.](https://github.com/gustavnikolaj/hijackresponse/commit/a4e3e6788f821836238f24ae39f39f07e03fdc01) ([Andreas Lind](mailto:andreas@one.com))
- [Update unexpected et al., remove peerDeped modules that are also deps.](https://github.com/gustavnikolaj/hijackresponse/commit/1d92e59b7cb2b69650ffaf78398b27b3a90f1e62) ([Andreas Lind](mailto:andreas@one.com))

### v1.0.4 (2016-03-30)

- [#5](https://github.com/gustavnikolaj/hijackresponse/pull/5) Relay the 'close' event from the original res to the hijacked response. ([Andreas Lind](mailto:andreas@one.com))

### v1.0.3 (2016-02-18)

#### Pull requests

- [#4](https://github.com/gustavnikolaj/hijackresponse/pull/4) Fix repository link in package.json. ([Hugo Josefson](mailto:hugo@josefson.org))

#### Commits to master

- [add homepage and bugs props to package.json](https://github.com/gustavnikolaj/hijackresponse/commit/b4eb7f55922eb8c30c06b40c656eca49014a293f) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [upgrade unexpected and friends to v10](https://github.com/gustavnikolaj/hijackresponse/commit/4578f47a1e284e3edac9cc4d50edb5e8589f7194) ([Gustav Nikolaj Olsen](mailto:gno@one.com))

### v1.0.2 (2015-09-25)

- [don't cause a build failure when submitting coverage to coveralls fails](https://github.com/gustavnikolaj/hijackresponse/commit/b950c91c54ef1824da9fee5cfa1087df22c61b6c) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [convert html link to md](https://github.com/gustavnikolaj/hijackresponse/commit/e75fb249d7ff9822890ef2b1f8626f4995749d75) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [add dependency badge](https://github.com/gustavnikolaj/hijackresponse/commit/69b75a87c8b8945b5026c5125712800fc00dcb31) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [add coveralls badge](https://github.com/gustavnikolaj/hijackresponse/commit/3125e67931b484651df9942d0499b0841d19c20a) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [add coveralls](https://github.com/gustavnikolaj/hijackresponse/commit/f8791759c16144e685e152c3602e4c9829484b22) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [+6 more](https://github.com/gustavnikolaj/hijackresponse/compare/v1.0.1...v1.0.2)

### v1.0.1 (2015-09-23)

- [when ending a hijacked response push null directly](https://github.com/gustavnikolaj/hijackresponse/commit/ae55e2acb55535d0c8d8908e3f678ddae97f62f6) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [remove unused variable in tests](https://github.com/gustavnikolaj/hijackresponse/commit/dab86bc8c969083449768847b4818fea637870b1) ([Gustav Nikolaj Olsen](mailto:gno@one.com))

### v1.0.0 (2015-09-23)

- [fix typo in tests](https://github.com/gustavnikolaj/hijackresponse/commit/9e66cbfa0d29947e7452e268959e2110b6090932) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [fix test failure on node 0.12](https://github.com/gustavnikolaj/hijackresponse/commit/6ba00f99ec0cc33d5dfe225312bf243c272ecabf) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [remove extra semicolon](https://github.com/gustavnikolaj/hijackresponse/commit/ef671488dbe73d01d6a67f4e985fba18dd093975) ([Gustav Nikolaj Olsen](mailto:gno@one.com))

### v0.0.2 (2015-09-22)

- [restore originalResponse methods when unhijacking](https://github.com/gustavnikolaj/hijackresponse/commit/a8d5c1b3bdc6b48a7a3c7cba82a87daceae36874) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [add headers to the example of hijacking multiple times](https://github.com/gustavnikolaj/hijackresponse/commit/35999fb7af9db9dd077bb1560baa042552d4d6b2) ([Gustav Nikolaj Olsen](mailto:gno@one.com))

### v0.0.1 (2015-09-22)

- [add papandreou as contributor](https://github.com/gustavnikolaj/hijackresponse/commit/da5005f684843dc02a49e33a01b00adfd301d4cd) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [remove test that do not make sense anymore](https://github.com/gustavnikolaj/hijackresponse/commit/daef05a3707488fcad981afe534b4f74872ddf25) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [fix styling errors](https://github.com/gustavnikolaj/hijackresponse/commit/76af32e7fd1d5f9b3304f0917c4fb5af0cff7122) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [add test for hijacking a hijacked response while piping](https://github.com/gustavnikolaj/hijackresponse/commit/5452dfae5d5e5f7023015d3c9ff7aee885b87738) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [add test for hijacking a hijacked response](https://github.com/gustavnikolaj/hijackresponse/commit/73877f024b5320e08ce4cffbcbf8cc9d067faba7) ([Gustav Nikolaj Olsen](mailto:gno@one.com))
- [+9 more](https://github.com/gustavnikolaj/hijackresponse/compare/da5005f684843dc02a49e33a01b00adfd301d4cd%5E...v0.0.1)

