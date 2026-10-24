#!/usr/bin/env bash
# Installs the release APK on the emulator, taps through the main screens, swipes a row,
# fires a test reminder, and collects logs + screenshots in out/ (pushed to the smoke-logs branch).
set -u
mkdir -p out
PKG=com.reshpow.subtrack
APK=$(ls apk/*.apk | head -1)
echo "APK: $APK" > out/summary.txt
adb install -r "$APK" > /dev/null 2>&1 && echo "install: ok" >> out/summary.txt || echo "install: FAILED" >> out/summary.txt
# Pre-grant so the Android 13+ permission dialog doesn't block the scripted taps.
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS
adb logcat -c
adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1

alive() { adb shell pidof $PKG > /dev/null; }
log() { echo "$*" >> out/summary.txt; }

dump() { # uiautomator can fail while the screen animates; retry a few times
  for _ in 1 2 3 4 5; do
    adb shell uiautomator dump /sdcard/ui.xml > /dev/null 2>&1 && adb pull /sdcard/ui.xml out/ui.xml > /dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

# Prints "x1 y1 x2 y2" for the first element whose text/description contains $1.
bounds() {
  dump || return 1
  python3 - "$1" <<'PY'
import re, sys
xml = open('out/ui.xml', encoding='utf-8', errors='ignore').read()
for node in re.findall(r'<node [^>]*>', xml):
    text = re.search(r' text="([^"]*)"', node).group(1)
    desc = re.search(r'content-desc="([^"]*)"', node).group(1)
    if sys.argv[1] in text or sys.argv[1] in desc:
        print(*re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', node).groups())
        break
PY
}

# Finds $1 (scrolling down up to $2 times) and taps it.
tap_text() {
  local b tries=${2:-0}
  for i in $(seq 0 "$tries"); do
    b=$(bounds "$1")
    if [ -n "$b" ]; then
      set -- "$1" $b
      adb shell input tap $(( ($2 + $4) / 2 )) $(( ($3 + $5) / 2 )); log "tapped '$1'"; return 0
    fi
    adb shell input swipe 160 450 160 150 300; sleep 1
  done
  log "NOT FOUND: '$1'"; return 1
}

has_text() { dump && grep -q "$1" out/ui.xml; }

step() { # name [wait]: screenshot + liveness
  sleep "${2:-3}"
  adb exec-out screencap -p > "out/$1.png"
  if alive; then log "$1: running"; else log "$1: NOT running (crashed)"; fi
}

step 01-launch 20
tap_text "Explore with sample data"; step 02-sample

# Swipe right on a row: it should move to Past.
b=$(bounds "Gym membership")
if [ -n "$b" ]; then
  set -- $b; y=$(( ($2 + $4) / 2 ))
  adb shell input swipe 70 $y 300 $y 400
  sleep 2
  if has_text 'Past · 3'; then log "swipe-archive: OK (Past · 3)"; else log "swipe-archive: FAILED (Past count unchanged)"; fi
else
  log "swipe-archive: row not found"
fi
step 03-after-swipe

tap_text "Insights"; step 04-insights
tap_text "Budget"; step 05-budget
tap_text "Settings"; step 06-settings
tap_text "Send a test reminder" 6; step 07-test-reminder 8
adb shell dumpsys notification --noredact > out/notifications.txt 2>&1
if grep -q "pkg=$PKG" out/notifications.txt; then log "test-reminder: posted"; else log "test-reminder: NOT posted"; fi
imp=$(grep "renewal-alerts" out/notifications.txt | grep -o "mImportance=[0-9]" | head -1)
log "reminder channel: ${imp:-not found} (4 = high, pops up on screen)"
adb shell cmd statusbar expand-notifications; sleep 2; adb exec-out screencap -p > out/08-notification-shade.png; adb shell cmd statusbar collapse

if alive; then log "PROCESS: running"; else log "PROCESS: NOT running (crashed or exited)"; fi
adb logcat -d > out/logcat.txt
grep -E "FATAL EXCEPTION|Fatal signal|E ReactNativeJS|AndroidRuntime: " out/logcat.txt | head -200 > out/errors.txt || true
exit 0
