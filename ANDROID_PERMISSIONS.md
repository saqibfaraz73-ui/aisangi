# Android Manifest Permissions for AiSangi

After running `npx cap add android`, you need to add these permissions to:
`android/app/src/main/AndroidManifest.xml`

Add inside the `<manifest>` tag (before `<application>`):

```xml
<!-- Internet access -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Camera (for OCR scan, photo capture) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

<!-- Storage - Android 6-9 (API 23-28) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="28" />

<!-- Storage - Android 10+ (API 29+) Scoped Storage -->
<!-- requestLegacyExternalStorage for Android 10 transition -->

<!-- Storage - Android 13+ (API 33+) Granular media permissions -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />

<!-- Android 14+ (API 34) - Visual media picker -->
<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />

<!-- Audio recording (for voice features) -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<!-- Vibration (haptic feedback) -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Foreground service (for long operations) -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

Also add inside the `<application>` tag:

```xml
android:requestLegacyExternalStorage="true"
android:usesCleartextTraffic="true"
```

## File Provider Setup

Add inside `<application>` in AndroidManifest.xml:

```xml
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.fileprovider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/file_paths" />
</provider>
```

Create `android/app/src/main/res/xml/file_paths.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external" path="." />
    <external-files-path name="external_files" path="." />
    <cache-path name="cache" path="." />
    <files-path name="files" path="." />
</paths>
```

## Permission Breakdown by Android Version

| Permission | Android 6-9 | Android 10 | Android 11-12 | Android 13+ | Android 14+ |
|---|---|---|---|---|---|
| READ_EXTERNAL_STORAGE | ✅ Required | ✅ Required | ✅ Required | ❌ Deprecated | ❌ Deprecated |
| WRITE_EXTERNAL_STORAGE | ✅ Required | ✅ (legacy) | ❌ Not needed | ❌ Not needed | ❌ Not needed |
| READ_MEDIA_IMAGES | N/A | N/A | N/A | ✅ Required | ✅ Required |
| READ_MEDIA_VIDEO | N/A | N/A | N/A | ✅ Required | ✅ Required |
| READ_MEDIA_AUDIO | N/A | N/A | N/A | ✅ Required | ✅ Required |
| READ_MEDIA_VISUAL_USER_SELECTED | N/A | N/A | N/A | N/A | ✅ Partial access |
| CAMERA | ✅ Runtime | ✅ Runtime | ✅ Runtime | ✅ Runtime | ✅ Runtime |

## After Setup

Run these commands after adding permissions:
```bash
npx cap sync android
npx cap run android
```
