#!/usr/bin/env bash
# Installs the release APK on the emulator, launches it, and collects logs + a screenshot.
set -u
mkdir -p out
APK=$(ls apk/*.apk | head -1)
echo "APK: $APK" > out/summary.txt
adb install -r "$APK" >> out/summary.txt 2>&1 || echo "INSTALL FAILED" >> out/summary.txt
adb logcat -c
adb shell monkey -p com.reshpow.subtrack -c android.intent.category.LAUNCHER 1 >> out/summary.txt 2>&1
sleep 30
adb exec-out screencap -p > out/screen.png
if adb shell pidof com.reshpow.subtrack > /dev/null; then echo "PROCESS: running" >> out/summary.txt; else echo "PROCESS: NOT running (crashed or exited)" >> out/summary.txt; fi
adb logcat -d > out/logcat.txt
grep -E "FATAL EXCEPTION|AndroidRuntime|ReactNativeJS|E/ReactNative|Exception|Error:" out/logcat.txt | grep -v "^--------- beginning" | head -300 > out/errors.txt || true
exit 0
