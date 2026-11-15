# Dalil station firmware

**Team Baseera (بصيرة)**, NASA Space Apps 2026, Doha. The program for the Crew Health Station's ESP32. It follows the fixed device ↔ app contract in the planning repo's `DEVICE_BUILD_GUIDE.md` section 9: one JSON line per message over USB at 115200 baud.

**Tested on the real station (15 Nov 2026):** MAX30102, MLX90614 and the 0.91" OLED all found. The automated connection tests pass (all except one line in about 60 that was corrupted by electrical noise, which the app ignores). The board was restarted 10 times in a row and found all three parts every time.

## What's in it
- `dalil_station/dalil_station.ino`: the whole program. The settings are at the top (FW version, finger threshold, step lengths, colour limits, LED and buzzer polarity).
- Uses the MAX30102 for heart rate and SpO2. If no MAX30102 answers, it switches to the backup Pulse Sensor on GPIO 34 automatically (heart rate only, `hr_sensor: "pulsesensor"`).
- **At start-up:** clears a stuck I2C bus (a sensor can hold the data wire low after a restart mid-read), and retries detection before calling a part missing.

## Install and upload (Mac or Windows)
1. Install `arduino-cli`. Mac: `brew install arduino-cli`. Windows: `winget install ArduinoSA.CLI`.
   - **Apple-chip Macs** also need Rosetta for one of the Arduino tools: `softwareupdate --install-rosetta --agree-to-license`.
2. Add the ESP32 boards and install the libraries:
   ```
   arduino-cli config init
   arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
   arduino-cli core update-index
   arduino-cli core install esp32:esp32
   arduino-cli lib install "SparkFun MAX3010x Pulse and Proximity Sensor Library" "Adafruit MLX90614 Library" "Adafruit SSD1306" "Adafruit GFX Library"
   ```
3. Find the port: `arduino-cli board list`. On a Mac it looks like `/dev/cu.usbserial-0001`; on Windows like `COM5` (install the CP210x driver if nothing shows).
4. **Close the Dalil app tab and any serial monitor,** then upload:
   ```
   arduino-cli compile --fqbn esp32:esp32:esp32 firmware/dalil_station
   arduino-cli upload  --fqbn esp32:esp32:esp32 -p /dev/cu.usbserial-0001 firmware/dalil_station
   ```
   If it stalls at "Connecting…", hold the board's **BOOT** button until writing starts. If it fails once with an esptool error, run it again.
5. Raise `FW_VERSION` every time you change the program. The app shows it.

## Test it
```
python3 -m venv .venv && .venv/bin/pip install pyserial
.venv/bin/python scripts/station/contract_test.py /dev/cu.usbserial-0001
```
It runs the build guide's §9.6 tests that need no finger: hello, idle timing, the 7 keys, START / STOP / busy / no_finger / unknown_cmd, LED commands, and no `nan` or `-999`. Then do one real check by hand (finger, then forehead) and in the app.

## Two algorithms (1.3)
- **Maxim** (the default, used at the event): the sample algorithm from SparkFun's library, on 4-sample averages (25 a second).
- **Dalil** (new): sample by sample at 100 a second.
  1. Remove the slow level, then smooth to the heartbeat band.
  2. Find each beat with an adaptive threshold.
  3. Measure every beat on its own: heart rate from the time between beats, SpO2 from the red/infrared "ratio of ratios" after removing drift and noise, with the same calibration curve as Maxim's.
  4. Reject bad beats one by one: implausible values, a weak pulse, or a beat too short or long for the recent rhythm.
- **Both run during every check.** `USE_DALIL_ALGORITHM` picks which one is reported. With `SHADOW_DEBUG` on, a `# maxim … | dalil …` line once a second shows both side by side (the app ignores `#` lines).
- **Optional:** `AUTO_BRIGHTNESS` adjusts the LED while the finger settles, keeping the infrared level strong but not saturated.
- **Test the algorithm without a board:** `python3 scripts/station/algo_test.py` feeds it synthetic pulses with known answers. Today: heart rate within 1 bpm, SpO2 within 2 points, with noise and drift.
- **Not tuned on real people yet.** Compare both against a reference oximeter before switching the default.

## Things we learned (Mac)
- **Opening the port can restart the board.** That's normal (guide §9.1); the app waits for `hello`.
- **Don't read the port in short timed pieces.** After a partial read, the Mac's CP210x driver can replay stale data at an impossible rate. Read continuously, the way Chrome does (the test script does too).
- **The same driver can replay old lines right after you reconnect,** so the app ignores a `done` line unless a check is actually running.

## Credits
SparkFun MAX3010x library and examples (MIT); Maxim's SpO2 algorithm; Adafruit MLX90614, SSD1306 and GFX libraries (BSD). Written by Team Baseera with an AI assistant (Claude Code), to the team's spec. MIT licence, like the rest of the repo.
