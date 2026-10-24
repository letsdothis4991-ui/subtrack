#!/usr/bin/env bash
# Installs the release APK on the emulator, opens it, taps through the main screens,
# and collects logs + screenshots. Results land in out/ (pushed to the smoke-logs branch).
set -u
mkdir -p out
PKG=com.reshpow.subtrack
APK=$(ls apk/*.apk | head -1)
echo "APK: $APK" > out/summary.txt
adb install -r "$APK" >> out/summary.txt 2>&1 || echo "INSTALL FAILED" >> out/summary.txt
adb logcat -c
adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1

alive() { adb shell pidof $PKG > /dev/null; }

# Taps the first on-screen element whose text or description matches $1.
tap_text() {
  adb shell uiautomator dump /sdcard/ui.xml > /dev/null 2>&1
  adb pull /sdcard/ui.xml out/ui.xml > /dev/null 2>&1
  local xy
  xy=$(python3 - "$1" <<'PY'
import re, sys
xml = open('out/ui.xml', encoding='utf-8', errors='ignore').read()
target = sys.argv[1]
for node in re.findall(r'<node [^>]*>', xml):
    text = re.search(r' text="([^"]*)"', node).group(1)
    desc = re.search(r'content-desc="([^"]*)"', node).group(1)
    if target in text or target in desc:
        a, b, c, d = map(int, re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', node).groups())
        print((a + c) // 2, (b + d) // 2)
        break
PY
)
  if [ -n "$xy" ]; then adb shell input tap $xy; echo "tapped '$1' at $xy" >> out/summary.txt; else echo "NOT FOUND: '$1'" >> out/summary.txt; fi
}

step() { # name, then screenshot + liveness
  sleep "${2:-4}"
  adb exec-out screencap -p > "out/$1.png"
  if alive; then echo "$1: running" >> out/summary.txt; else echo "$1: NOT running (crashed)" >> out/summary.txt; fi
}

step 01-launch 20
tap_text "Explore with sample data"; step 02-sample
tap_text "Insights"; step 03-insights
tap_text "Budget"; step 04-budget
tap_text "Settings"; step 05-settings
tap_text "Subscriptions"; step 06-back-to-list
tap_text "Netflix"; step 07-detail

if alive; then echo "PROCESS: running" >> out/summary.txt; else echo "PROCESS: NOT running (crashed or exited)" >> out/summary.txt; fi
adb logcat -d > out/logcat.txt
grep -E "FATAL EXCEPTION|Fatal signal|E ReactNativeJS|AndroidRuntime: " out/logcat.txt | head -200 > out/errors.txt || true
exit 0
