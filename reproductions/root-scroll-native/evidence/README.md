# Native recordings

Only the public empty-input fixture and system keyboard appear in these recordings.

| Recording | Result |
| --- | --- |
| [Main, iOS fast](main-ios-fast.mp4) | Reaches Row 39, composer touches remain zero. |
| [Main, Android fast](main-android-fast.mp4) | Reaches Row 39, composer touches remain zero. |
| [Proposed adapter, Android fast](proposed-android-fast-failure.mp4) | Offset remains zero; repeated swipes touch Composer instead. |

All three files passed AVFoundation playback and final-frame decoding checks.
The proposed adapter's final stop reported a screenrecord ownership check error;
the recording remained playable and no screenrecord process remained afterward.
Checksums are in `manifest.json`.
