# Third-Party Notices

BiliMux itself is licensed under MIT. Bundled and linked third-party components include:

## GPAC / MP4Box

This product includes binaries from [GPAC](https://gpac.io/) (MP4Box), licensed under the GNU Lesser General Public License (LGPL) v2.1 or later.

- Project: https://github.com/gpac/gpac
- License: https://github.com/gpac/gpac/blob/master/COPYING

| Platform | Binary | Notes | SHA-256 |
| --- | --- | --- | --- |
| darwin arm64 | `extra/darwin/MP4Box` | Locally built static GPAC v26.07.0 | `28324a116ab11812bf54b02e72de8b3f8252cab10eb006dc57eb318364490e77` |
| linux x64 | `extra/linux/MP4Box` | Bundled as-is; provenance unverified | `9d42e3d21299a6d829ea304eb92e149950a83ce5f3016c5f16c826998e8f7ce2` |
| win32 x64 | `extra/win32/MP4Box.exe` | Bundled as-is; provenance unverified | `348944edd1315def890977a844f47fabf61b4a22abd18ba0ae383b7d4a28d765` |

To rebuild the macOS binary:

```bash
./configure --static-bin --use-zlib=no --disable-curl --disable-nghttp2 && make -j4
```

## Other runtime libraries

JavaScript dependencies are listed in `package.json` and shipped with their respective licenses (MIT / ISC / Apache-2.0, etc.).
