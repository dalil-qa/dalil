// =====================================================================================================
// Dalil Crew Health Station: firmware for the ESP32 (NASA Space Apps 2026, Team Baseera)
// MIT License (see the LICENSE file in the repository).
//
// What it does: a 30-second check. Finger on the pulse/oxygen sensor (about 20 s), then forehead in front of
// the thermometer (about 5 s). It shows the result on the small screen and the RGB light, and talks to the Dalil
// web app over the USB cable, one JSON line per message, exactly as DEVICE_BUILD_GUIDE.md section 9 says.
//
// Credits:
// - SparkFun MAX3010x Pulse and Proximity Sensor Library and its examples (SparkFun Electronics, MIT licence).
// - Maxim Integrated's heart-rate and SpO2 algorithm (spo2_algorithm.h, shipped with the SparkFun library).
// - Adafruit MLX90614, Adafruit SSD1306 and Adafruit GFX libraries (Adafruit Industries, BSD licence).
// Written with the help of an AI assistant (Claude Code), to the team's spec in DEVICE_BUILD_GUIDE.md 8 and 10.3.
//
// Hardware: classic ESP32 (ESP32-WROOM-32). I2C on SDA 21 / SCL 22 at 100 kHz: OLED 0x3C, MAX30102 0x57,
// MLX90614 0x5A. Button GPIO 32 to GND. RGB LED (common cathode) R 25 / G 26 / B 27. Active buzzer GPIO 33.
// Backup "Pulse Sensor Amped" on GPIO 34 (used automatically when no MAX30102 answers).
// =====================================================================================================

#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#include <Adafruit_MLX90614.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ----------------------------------- settings (change and upload again) ---------------------------------
const char *FW_VERSION = "1.3";          // shown by the app; raise it every time you upload a new version
const uint32_t FINGER_IR_MIN = 50000;    // infrared above this = a finger is on the MAX30102
const int FINGER_SECONDS = 20;           // seconds of finger time per check
const int NO_FINGER_TIMEOUT_S = 15;      // no finger this long in a row = error no_finger
const int FINGER_STEP_MAX_S = 60;        // the finger step may last at most this long
const int MIN_GOOD_RESULTS = 3;          // fewer good results = error bad_signal
const int FOREHEAD_SECONDS = 5;          // seconds of forehead readings
const int FOREHEAD_TIMEOUT_S = 15;       // stop waiting for a forehead after this
const float TEMP_MIN_VALID = 30.0;       // readings below this are the room, not a forehead
const float TEMP_MAX_VALID = 42.0;       // readings above this are not a forehead either
const int RESULT_SHOW_S = 30;            // how long the result stays on the screen and light
const int ERROR_SHOW_S = 5;              // how long "Try again" stays on the screen
const int APP_MODE_TIMEOUT_S = 60;       // a command in the last 60 s = the app is connected
const bool LED_COMMON_ANODE = false;     // true = invert the LED values (255 - value)
const bool BUZZER_ACTIVE_LOW = false;    // true = LOW makes the buzzer beep
const int AMBER_GREEN_LEVEL = 60;        // green mixed with full red to make amber (0-255)
const bool MLX_ON_WIRE1 = false;         // true = thermometer on its own bus: SDA 18, SCL 19
const bool PULSE_SENSOR_FALLBACK = true; // true = use the Pulse Sensor on GPIO 34 when no MAX30102 answers
const int PULSE_MIN_AMPLITUDE = 200;     // Pulse Sensor: smallest swing that counts as a heartbeat signal
// Accuracy settings (added in 1.2)
const unsigned long FINGER_SETTLE_MS = 2500; // ignore the first 2.5 s after the finger lands (the signal jumps while it settles)
const int ALGO_STEP = 12;                // run the SpO2 algorithm every 12 new samples (about twice a second)
const int HR_OUTLIER_MIN_BAND = 6;       // results further than this (bpm) from the middle may be outliers
const int SPO2_OUTLIER_MIN_BAND = 2;     // the same for SpO2 (%)
const float SKIN_EMISSIVITY = 0.98;      // skin emits slightly less than the sensor's factory setting (1.0)
const float TEMP_STABLE_RANGE = 0.3;     // 3 readings within 0.3 C = the forehead is held still at the right distance
const float WEAK_PULSE_PERCENT = 0.15;   // pulse strength (AC/DC of infrared) below this % = weak signal: show a hint
const float MOVE_PERCENT = 3.0;          // infrared level changing more than this % between windows = moving: show a hint
// The Dalil algorithm (added in 1.3; see dalilSample). Both algorithms always run; this picks which one reports.
const bool USE_DALIL_ALGORITHM = false;  // false = Maxim's sample algorithm (tested at the event), true = the new one
const bool AUTO_BRIGHTNESS = false;      // true = adjust the LED brightness while the finger settles
const bool SHADOW_DEBUG = true;          // once a second during the finger step, print "# maxim ... | dalil ..." to compare
const int LED_DEFAULT = 60;              // LED brightness (0-255) when a finger first lands
const uint32_t IR_TARGET_LOW = 90000;    // automatic brightness keeps the infrared level between these two
const uint32_t IR_TARGET_HIGH = 220000;  // (the 18-bit sensor saturates near 262000)
// Standalone colour limits (used only when the app is not connected)
const int RED_HR_LOW = 40, RED_HR_HIGH = 130, RED_SPO2_BELOW = 90;
const float RED_TEMP_FROM = 38.0;
const int AMBER_HR_LOW = 50, AMBER_HR_HIGH = 100, AMBER_SPO2_BELOW = 95;
const float AMBER_TEMP_FROM = 37.5;

// ----------------------------------- pins (never use GPIO 6-11) ----------------------------------------
const int PIN_SDA = 21, PIN_SCL = 22;
const int PIN_BUTTON = 32;
const int PIN_R = 25, PIN_G = 26, PIN_B = 27;
const int PIN_BUZZER = 33;
const int PIN_PULSE = 34;

// ----------------------------------- devices -----------------------------------------------------------
MAX30105 particleSensor;
Adafruit_MLX90614 mlx = Adafruit_MLX90614();
// The two 100000UL values stop the screen library switching the bus to 400 kHz while drawing.
Adafruit_SSD1306 oled(128, 32, &Wire, -1, 100000UL, 100000UL);

bool hasMax = false;    // MAX30102 answered at start-up
bool hasMlx = false;    // MLX90614 answered at start-up
bool hasOled = false;   // screen answered at start-up
bool usePulse = false;  // no MAX30102, so the backup Pulse Sensor is used

// ----------------------------------- the check -------------------------------------------------------
enum State { IDLE, FINGER, FOREHEAD };
State state = IDLE;
unsigned long stepStartMs = 0;
unsigned long lastLineMs = 0;

// Values of the current check (-1 / NAN mean "not measured": printed as null).
int hrValue = -1, spo2Value = -1;
float tempValue = NAN;
float qValue = NAN;

// Good results from the finger step (medians are taken from these).
const int MAX_GOOD = 60;
int goodHr[MAX_GOOD], goodSpo2[MAX_GOOD];
int goodCount = 0;      // good results (both HR and SpO2 valid, or HR for the Pulse Sensor)
int resultCount = 0;    // all results the algorithm produced

// Finger timing.
bool fingerOn = false;
unsigned long fingerOnMs = 0;      // total finger-on time in this step
unsigned long lastFingerTick = 0;  // to add up finger-on time
unsigned long noFingerSince = 0;   // when the finger was last lifted (or the step started)

// MAX30102 buffers: 100 samples (4 s at 25 samples/s), as in SparkFun Example8.
uint32_t irBuffer[100], redBuffer[100];
int bufCount = 0;        // samples in the buffer while it fills
int newSamples = 0;      // new samples since the last calculation, once it is full
uint32_t lastIr = 0;
unsigned long settleUntil = 0;     // finger samples are ignored until then
float lastWindowDc = 0;            // infrared level of the previous window (to spot movement)
enum Hint { HINT_NONE, HINT_STILL, HINT_LIGHT };
Hint fingerHint = HINT_NONE;       // coaching shown on the screen during the finger step

// Pulse Sensor beat detection.
const int PULSE_WINDOW = 200;            // 2 s of samples at 100 per second
int pulseRing[PULSE_WINDOW];
int pulseIndex = 0, pulseFilled = 0;
int pulsePrev = 0;
unsigned long lastPulseSampleMs = 0, lastBeatMs = 0, lastPulseResultMs = 0;
unsigned long beatIntervals[8];
int beatCount = 0, beatIndex = 0;
int pulseAmplitude = 0;

// Results from each algorithm. The selected one is copied into goodHr / goodSpo2 / goodCount / resultCount.
struct Results { int hr[MAX_GOOD]; int spo2[MAX_GOOD]; int good; int all; };
Results maximRes, dalilRes;

// The sensor runs at 100 samples a second; Maxim's algorithm gets the average of every 4 (25 a second, as it expects).
uint32_t accRed = 0, accIr = 0;
int accN = 0;

// The Dalil algorithm: filters, beat finder and the last 2.56 s of raw samples (100 a second).
const int DW = 256;
uint32_t dRawIr[DW], dRawRed[DW];
unsigned long dN = 0;              // samples since the finger settled
bool dInit = false;
float dDcIr = 0, dLp1 = 0, dLp2 = 0, dPrev1 = 0, dPrev2 = 0, dEnvelope = 0;
long dLastPeak = -1;
int dRecent[8];                    // recent beat intervals (samples), to spot missed or extra beats
int dRecentCount = 0, dRecentIndex = 0;

// Automatic LED brightness (only while the finger settles).
int ledAmp = 60;
uint32_t agcSum = 0;
int agcN = 0;

// Forehead.
unsigned long lastTempReadMs = 0, firstForeheadMs = 0;
float tempRun[3];
int tempRunCount = 0;
float bestTemp = NAN;        // best average of any 3 readings in a row
float bestStableTemp = NAN;  // best average of 3 steady readings in a row (preferred)

// Result / error / light shown after a check.
enum Colour { C_OFF, C_WHITE, C_GREEN, C_AMBER, C_RED, C_BLUE };
Colour shownColour = C_OFF;
unsigned long colourUntil = 0;     // the result colour stays until then
bool resultOnScreen = false;
unsigned long resultUntil = 0;
char resultWord[10] = "";
char resultLine[24] = "";
unsigned long errorUntil = 0;
char errorReason[16] = "";

// App mode: a valid command arrived recently.
unsigned long lastCommandMs = 0;
bool commandSeen = false;

// Button.
bool buttonStable = HIGH, buttonLastRead = HIGH;
unsigned long buttonChangedMs = 0;

// Serial command input.
char cmdBuf[33];
int cmdLen = 0;
bool cmdOverflow = false;

// Screen: only redraw when the text changed, at most twice a second.
char wantLines[4][22], shownLines[4][22];
unsigned long lastDrawMs = 0;

// =====================================================================================================
// Small helpers
// =====================================================================================================

bool appMode() { return commandSeen && millis() - lastCommandMs < (unsigned long)APP_MODE_TIMEOUT_S * 1000UL; }

void setRgb(int r, int g, int b) {
  if (LED_COMMON_ANODE) { r = 255 - r; g = 255 - g; b = 255 - b; }
  analogWrite(PIN_R, r);
  analogWrite(PIN_G, g);
  analogWrite(PIN_B, b);
}

void showColour(Colour c) {
  switch (c) {
    case C_WHITE: setRgb(255, 255, 255); break;
    case C_GREEN: setRgb(0, 255, 0); break;
    case C_AMBER: setRgb(255, AMBER_GREEN_LEVEL, 0); break;
    case C_RED:   setRgb(255, 0, 0); break;
    case C_BLUE:  setRgb(0, 0, 255); break;
    default:      setRgb(0, 0, 0); break;
  }
}

void buzzer(bool on) { digitalWrite(PIN_BUZZER, (on != BUZZER_ACTIVE_LOW) ? HIGH : LOW); }

// Beeps may block briefly, but only at start-up, step changes, the result and errors.
void beep(int ms) { buzzer(true); delay(ms); buzzer(false); }

bool i2cAnswers(TwoWire &bus, uint8_t address) {
  bus.beginTransmission(address);
  return bus.endTransmission() == 0;
}

// A part that doesn't answer straight away gets a few more tries (they can be slow right after a restart).
bool i2cAnswersRetry(TwoWire &bus, uint8_t address) {
  for (int i = 0; i < 5; i++) {
    if (i2cAnswers(bus, address)) return true;
    delay(20);
  }
  return false;
}

// If the ESP32 restarted in the middle of reading a sensor, that sensor can still be holding the data wire (SDA)
// low, which blocks the whole bus until it gets more clock pulses. This releases it: up to 16 clock pulses,
// then a STOP. It runs before Wire.begin().
void i2cBusRecover(int sda, int scl) {
  pinMode(sda, INPUT_PULLUP);
  pinMode(scl, OUTPUT_OPEN_DRAIN);
  digitalWrite(scl, HIGH);
  delayMicroseconds(10);
  for (int i = 0; i < 16 && digitalRead(sda) == LOW; i++) {
    digitalWrite(scl, LOW);  delayMicroseconds(10);
    digitalWrite(scl, HIGH); delayMicroseconds(10);
  }
  // STOP: SDA goes from low to high while SCL is high.
  pinMode(sda, OUTPUT_OPEN_DRAIN);
  digitalWrite(sda, LOW);  delayMicroseconds(10);
  digitalWrite(scl, HIGH); delayMicroseconds(10);
  digitalWrite(sda, HIGH); delayMicroseconds(10);
  pinMode(sda, INPUT);
  pinMode(scl, INPUT);
}

int median(const int *values, int n) {
  int copy[MAX_GOOD];
  for (int i = 0; i < n; i++) copy[i] = values[i];
  for (int i = 1; i < n; i++) {  // insertion sort: n is at most 60
    int v = copy[i], j = i - 1;
    while (j >= 0 && copy[j] > v) { copy[j + 1] = copy[j]; j--; }
    copy[j + 1] = v;
  }
  return n % 2 ? copy[n / 2] : (copy[n / 2 - 1] + copy[n / 2]) / 2;
}

// The middle value after dropping outliers: results far from the median (more than 3 x the typical spread, and at
// least `minBand`) are left out, so one bad second can't pull the result.
int robustCenter(const int *values, int n, int minBand) {
  if (n <= 2) return median(values, n);
  int m = median(values, n);
  int dev[MAX_GOOD];
  for (int i = 0; i < n; i++) dev[i] = abs(values[i] - m);
  int mad = median(dev, n);
  int band = max(minBand, (int)(3.0f * 1.4826f * mad + 0.5f));
  int kept[MAX_GOOD], k = 0;
  for (int i = 0; i < n; i++) if (abs(values[i] - m) <= band) kept[k++] = values[i];
  return k > 0 ? median(kept, k) : m;
}

unsigned long medianUL(const unsigned long *values, int n) {
  unsigned long copy[8];
  for (int i = 0; i < n; i++) copy[i] = values[i];
  for (int i = 1; i < n; i++) {
    unsigned long v = copy[i];
    int j = i - 1;
    while (j >= 0 && copy[j] > v) { copy[j + 1] = copy[j]; j--; }
    copy[j + 1] = v;
  }
  return n % 2 ? copy[n / 2] : (copy[n / 2 - 1] + copy[n / 2]) / 2;
}

// =====================================================================================================
// Messages to the app (section F). One JSON object per line, never nan / -999 / 0 for "not measured".
// =====================================================================================================

void sendHello() {
  const char *hr = hasMax ? "max30102" : (usePulse ? "pulsesensor" : "none");
  char line[200];
  snprintf(line, sizeof line,
           "{\"stage\":\"hello\",\"device\":\"dalil-station\",\"fw\":\"%s\",\"proto\":1,\"hr_sensor\":\"%s\",\"temp_sensor\":\"%s\",\"oled\":%s}",
           FW_VERSION, hr, hasMlx ? "mlx90614" : "none", hasOled ? "true" : "false");
  Serial.println(line);
}

// The ONE function for idle, finger, forehead and done lines, so the 7 keys are always the same, in this order.
void sendMeasure(const char *stage, int hr, int spo2, float temp, bool finger, float q, int left) {
  char hrS[8], spo2S[8], tempS[10], qS[8], leftS[8];
  if (hr >= 0) snprintf(hrS, sizeof hrS, "%d", hr); else strcpy(hrS, "null");
  if (spo2 >= 0) snprintf(spo2S, sizeof spo2S, "%d", spo2); else strcpy(spo2S, "null");
  if (!isnan(temp)) snprintf(tempS, sizeof tempS, "%.1f", temp); else strcpy(tempS, "null");
  if (!isnan(q)) snprintf(qS, sizeof qS, "%.2f", q); else strcpy(qS, "null");
  if (left >= 0) snprintf(leftS, sizeof leftS, "%d", left); else strcpy(leftS, "null");
  char line[200];
  snprintf(line, sizeof line,
           "{\"stage\":\"%s\",\"hr\":%s,\"spo2\":%s,\"temp\":%s,\"finger\":%s,\"q\":%s,\"left\":%s}",
           stage, hrS, spo2S, tempS, finger ? "true" : "false", qS, leftS);
  Serial.println(line);
}

void sendErrorLine(const char *code, const char *msg) {
  char line[200];
  snprintf(line, sizeof line, "{\"stage\":\"error\",\"code\":\"%s\",\"msg\":\"%s\"}", code, msg);
  Serial.println(line);
}

// =====================================================================================================
// Screen
// =====================================================================================================

void setScreen(const char *a, const char *b = "", const char *c = "", const char *d = "") {
  const char *src[4] = {a, b, c, d};
  for (int i = 0; i < 4; i++) {
    strncpy(wantLines[i], src[i], 21);
    wantLines[i][21] = '\0';
  }
}

void updateScreen() {
  if (!hasOled) return;
  bool changed = false;
  for (int i = 0; i < 4; i++) if (strcmp(wantLines[i], shownLines[i]) != 0) changed = true;
  if (!changed || millis() - lastDrawMs < 500) return;
  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);
  for (int i = 0; i < 4; i++) {
    oled.setCursor(0, i * 8);
    oled.print(wantLines[i]);
    strcpy(shownLines[i], wantLines[i]);
  }
  oled.display();
  lastDrawMs = millis();
}

// =====================================================================================================
// Errors and results
// =====================================================================================================

// D6: one error line, a long beep, light off, back to IDLE with "Try again" on the screen.
void failCheck(const char *code, const char *msg, const char *reason) {
  sendErrorLine(code, msg);
  state = IDLE;
  resultOnScreen = false;
  shownColour = C_OFF;
  showColour(C_OFF);
  beep(600);
  strncpy(errorReason, reason, sizeof errorReason - 1);
  errorReason[sizeof errorReason - 1] = '\0';
  errorUntil = millis() + (unsigned long)ERROR_SHOW_S * 1000UL;
  lastLineMs = millis();
}

void formatResultLine() {
  char h[6], s[6], t[8];
  if (hrValue >= 0) snprintf(h, sizeof h, "%d", hrValue); else strcpy(h, "--");
  if (spo2Value >= 0) snprintf(s, sizeof s, "%d", spo2Value); else strcpy(s, "--");
  if (!isnan(tempValue)) snprintf(t, sizeof t, "%.1f", tempValue); else strcpy(t, "--");
  snprintf(resultLine, sizeof resultLine, "%sbpm %s%% %sC", h, s, t);
}

// D5: the standalone colour when the app is not connected (comparisons with missing values are skipped).
Colour standaloneColour() {
  bool red = (hrValue >= 0 && (hrValue < RED_HR_LOW || hrValue > RED_HR_HIGH)) ||
             (spo2Value >= 0 && spo2Value < RED_SPO2_BELOW) ||
             (!isnan(tempValue) && tempValue >= RED_TEMP_FROM);
  if (red) return C_RED;
  bool missing = hrValue < 0 || isnan(tempValue) || (spo2Value < 0 && !usePulse);  // the Pulse Sensor has no SpO2
  bool amber = (hrValue >= 0 && (hrValue < AMBER_HR_LOW || hrValue > AMBER_HR_HIGH)) ||
               (spo2Value >= 0 && spo2Value < AMBER_SPO2_BELOW) ||
               (!isnan(tempValue) && tempValue >= AMBER_TEMP_FROM) || missing;
  return amber ? C_AMBER : C_GREEN;
}

const char *wordFor(Colour c) {
  switch (c) {
    case C_GREEN: return "OK";
    case C_AMBER: return "CHECK";
    case C_RED: return "ALERT";
    case C_WHITE: return "SEE APP";
    default: return "";
  }
}

void finishCheck() {
  sendMeasure("done", hrValue, spo2Value, tempValue, false, qValue, -1);
  state = IDLE;
  lastLineMs = millis();
  formatResultLine();
  shownColour = appMode() ? C_WHITE : standaloneColour();  // in app mode, wait for the app's colour
  strcpy(resultWord, wordFor(shownColour));
  resultOnScreen = true;
  resultUntil = colourUntil = millis() + (unsigned long)RESULT_SHOW_S * 1000UL;
  showColour(shownColour);
  beep(100); delay(80); beep(100);
}

// =====================================================================================================
// Starting the steps
// =====================================================================================================

void resetFingerData() {
  bufCount = 0;
  newSamples = 0;
  beatCount = 0;
  beatIndex = 0;
  lastBeatMs = 0;
  pulseFilled = 0;
  pulseIndex = 0;
}

void startForehead() {
  state = FOREHEAD;
  stepStartMs = millis();
  lastLineMs = 0;
  firstForeheadMs = 0;
  tempRunCount = 0;
  bestTemp = NAN;
  bestStableTemp = NAN;
  tempValue = NAN;
  showColour(C_BLUE);  // blue, steady
  beep(100);
  if (!hasMlx) finishCheck();  // no thermometer: skip this step, temp stays null
}

void startCheck() {
  bool hrSensor = hasMax || usePulse;
  if (!hrSensor && !hasMlx) {
    sendErrorLine("no_sensors", "No sensors found");
    strcpy(errorReason, "No sensors");
    errorUntil = millis() + (unsigned long)ERROR_SHOW_S * 1000UL;
    beep(600);
    return;
  }
  hrValue = spo2Value = -1;
  tempValue = qValue = NAN;
  goodCount = resultCount = 0;
  clearResults(maximRes);
  clearResults(dalilRes);
  dalilReset();
  if (AUTO_BRIGHTNESS) setLed(LED_DEFAULT);
  resultOnScreen = false;
  errorUntil = 0;
  shownColour = C_OFF;
  colourUntil = 0;
  if (hrSensor) {
    state = FINGER;
    stepStartMs = millis();
    lastLineMs = 0;
    fingerOnMs = 0;
    lastFingerTick = millis();
    noFingerSince = millis();
    fingerOn = false;
    resetFingerData();
    settleUntil = 0;
    lastWindowDc = 0;
    fingerHint = HINT_NONE;
    beep(100);
  } else {
    startForehead();
  }
}

void cancelCheck() { failCheck("cancelled", "Check cancelled", "Cancelled"); }

// =====================================================================================================
// Sensors: read in every state, without blocking
// =====================================================================================================

void clearResults(Results &r) { r.good = 0; r.all = 0; }

void addResult(Results &r, bool valid, int hr, int spo2) {
  r.all++;
  if (valid && r.good < MAX_GOOD) {
    r.hr[r.good] = hr;
    r.spo2[r.good] = spo2;
    r.good++;
  }
}

// Make one algorithm's results the check's values (hr, spo2, q and the count MIN_GOOD_RESULTS looks at).
void publish(const Results &r) {
  goodCount = r.good;
  resultCount = r.all;
  for (int i = 0; i < r.good; i++) { goodHr[i] = r.hr[i]; goodSpo2[i] = r.spo2[i]; }
  if (goodCount > 0) {
    hrValue = robustCenter(goodHr, goodCount, HR_OUTLIER_MIN_BAND);
    spo2Value = robustCenter(goodSpo2, goodCount, SPO2_OUTLIER_MIN_BAND);
  }
  qValue = resultCount > 0 ? (float)goodCount / (float)resultCount : NAN;
}

void dalilReset() {
  dInit = false;
  dN = 0;
  dEnvelope = 0;
  dLastPeak = -1;
  dPrev1 = dPrev2 = 0;
  dRecentCount = dRecentIndex = 0;
}

// One heartbeat, from peak a to peak b (sample numbers): heart rate from the time between them, and SpO2 from how
// much red pulses compared with infrared over that beat ("ratio of ratios"). Each beat is checked on its own.
void dalilBeat(long a, long b) {
  int n = (int)(b - a);
  uint32_t irStart = dRawIr[a % DW], irEnd = dRawIr[b % DW];
  uint32_t redStart = dRawRed[a % DW], redEnd = dRawRed[b % DW];
  float irMin = 1e12, irMax = -1e12, redMin = 1e12, redMax = -1e12;
  double irSum = 0, redSum = 0;
  for (long k = a; k <= b; k++) {
    // A 7-sample (70 ms) average first: random noise would otherwise make the highest-minus-lowest span bigger,
    // and it hits the weaker red signal harder, which would skew SpO2 low. Both colours are smoothed the same way.
    float irAvg = 0, redAvg = 0;
    int m = 0;
    for (long j = k - 3; j <= k + 3; j++) {
      if (j < a || j > b) continue;
      irAvg += dRawIr[j % DW];
      redAvg += dRawRed[j % DW];
      m++;
    }
    irAvg /= m;
    redAvg /= m;
    float t = (float)(k - a) / (float)n;
    // Remove the straight-line drift across the beat, so slow changes don't inflate the pulse size.
    float ir = irAvg - ((float)irStart + ((float)irEnd - (float)irStart) * t);
    float red = redAvg - ((float)redStart + ((float)redEnd - (float)redStart) * t);
    irMin = min(irMin, ir); irMax = max(irMax, ir);
    redMin = min(redMin, red); redMax = max(redMax, red);
    irSum += dRawIr[k % DW];
    redSum += dRawRed[k % DW];
  }
  float dcIr = irSum / (n + 1), dcRed = redSum / (n + 1);
  float acIr = irMax - irMin, acRed = redMax - redMin;
  int hr = (int)lroundf(6000.0f / (float)n);  // 100 samples a second
  bool valid = hr >= 40 && hr <= 180 && dcIr > 0 && dcRed > 0 && acIr > 0;
  float perfusion = valid ? 100.0f * acIr / dcIr : 0;   // pulse strength, %
  float r = valid ? (acRed / dcRed) / (acIr / dcIr) : 0;
  // Maxim's calibration curve (the same one its algorithm's look-up table follows).
  float spo2f = -45.060f * r * r + 30.354f * r + 94.845f;
  if (spo2f > 100) spo2f = 100;
  valid = valid && perfusion >= 0.02f && perfusion <= 10.0f && r > 0.3f && r < 1.6f && spo2f >= 70;
  // Rhythm check: a beat much shorter or longer than the recent ones is probably a missed or extra peak.
  if (dRecentCount >= 3) {
    int med = median(dRecent, dRecentCount);
    if (abs(n - med) > med / 4) valid = false;
  }
  dRecent[dRecentIndex] = n;
  dRecentIndex = (dRecentIndex + 1) % 8;
  if (dRecentCount < 8) dRecentCount++;
  addResult(dalilRes, valid, hr, (int)lroundf(spo2f));
  if (USE_DALIL_ALGORITHM) publish(dalilRes);
}

// The Dalil algorithm, sample by sample (100 a second, after the finger has settled):
// 1. remove the slow level (a moving average of about 0.5 s), 2. smooth out fast noise (two gentle low-pass steps,
// leaving the heartbeat band of about 0.5-4 Hz), 3. find each beat as a peak above half of a slowly fading envelope,
// at least 300 ms after the last one, 4. measure each beat on its own (dalilBeat).
void dalilSample(uint32_t red, uint32_t ir) {
  if (!dInit) {
    dDcIr = ir;
    dLp1 = dLp2 = 0;
    dInit = true;
  }
  dDcIr += 0.02f * ((float)ir - dDcIr);
  float hp = -((float)ir - dDcIr);   // inverted: each heartbeat makes the reflected infrared dip
  dLp1 += 0.3f * (hp - dLp1);
  dLp2 += 0.3f * (dLp1 - dLp2);
  float f = dLp2;
  int idx = dN % DW;
  dRawIr[idx] = ir;
  dRawRed[idx] = red;
  dEnvelope = max(dEnvelope * 0.995f, f);
  if (dN >= 100 && dPrev1 > dPrev2 && dPrev1 >= f && dPrev1 > 0 && dPrev1 > 0.5f * dEnvelope) {  // skip the first second
    long peak = (long)dN - 1;
    if (dLastPeak < 0 || peak - dLastPeak >= 30) {          // at least 300 ms apart (at most 200 bpm)
      if (dLastPeak >= 0 && peak - dLastPeak <= 150) dalilBeat(dLastPeak, peak);  // at most 1.5 s (at least 40 bpm)
      dLastPeak = peak;
    }
  }
  dPrev2 = dPrev1;
  dPrev1 = f;
  dN++;
}

// Automatic brightness while the finger settles: aim for a strong infrared level that isn't saturated.
void agcSample(uint32_t ir) {
  agcSum += ir / 16;  // scaled down so the sum fits
  agcN++;
  if (agcN < 25) return;
  uint32_t avg = (agcSum / agcN) * 16;
  agcSum = 0;
  agcN = 0;
  int next = ledAmp;
  if (avg > IR_TARGET_HIGH) next = max(10, (ledAmp * 4) / 5);
  else if (avg < IR_TARGET_LOW) next = min(255, (ledAmp * 5) / 4 + 1);
  if (next != ledAmp) {
    ledAmp = next;
    particleSensor.setPulseAmplitudeRed(ledAmp);
    particleSensor.setPulseAmplitudeIR(ledAmp);
  }
}

void setLed(int amp) {
  ledAmp = amp;
  if (!hasMax) return;
  particleSensor.setPulseAmplitudeRed(amp);
  particleSensor.setPulseAmplitudeIR(amp);
}

// The algorithm runs on the latest 100 samples; a result is good only if valid and believable.
void runSpo2Algorithm() {
  int32_t spo2, hr;
  int8_t validSpo2, validHr;
  maxim_heart_rate_and_oxygen_saturation(irBuffer, 100, redBuffer, &spo2, &validSpo2, &hr, &validHr);
  bool valid = validHr == 1 && validSpo2 == 1 && hr >= 40 && hr <= 180 && spo2 >= 70 && spo2 <= 100;
  addResult(maximRes, valid, hr, spo2);
  if (!USE_DALIL_ALGORITHM) publish(maximRes);

  // Coaching: pulse strength (perfusion) and movement, from the infrared window.
  uint32_t mn = irBuffer[0], mx = irBuffer[0];
  double sum = 0;
  for (int i = 0; i < 100; i++) { mn = min(mn, irBuffer[i]); mx = max(mx, irBuffer[i]); sum += irBuffer[i]; }
  float dc = sum / 100.0;
  float pulsePercent = dc > 0 ? 100.0f * (float)(mx - mn) / dc : 0;
  bool moving = lastWindowDc > 0 && fabsf(dc - lastWindowDc) / lastWindowDc * 100.0f > MOVE_PERCENT;
  lastWindowDc = dc;
  fingerHint = moving ? HINT_STILL : (pulsePercent < WEAK_PULSE_PERCENT ? HINT_LIGHT : HINT_NONE);
}

void addMaxSample(uint32_t red, uint32_t ir) {
  if (bufCount < 100) {  // filling the first 4 seconds
    redBuffer[bufCount] = red;
    irBuffer[bufCount] = ir;
    bufCount++;
    if (bufCount == 100) runSpo2Algorithm();
    return;
  }
  if (newSamples == 0) {  // start of a new step: shift out the oldest ALGO_STEP samples (as Example8 does with 25)
    memmove(redBuffer, redBuffer + ALGO_STEP, (100 - ALGO_STEP) * sizeof(uint32_t));
    memmove(irBuffer, irBuffer + ALGO_STEP, (100 - ALGO_STEP) * sizeof(uint32_t));
  }
  redBuffer[100 - ALGO_STEP + newSamples] = red;
  irBuffer[100 - ALGO_STEP + newSamples] = ir;
  newSamples++;
  if (newSamples == ALGO_STEP) {
    runSpo2Algorithm();
    newSamples = 0;
  }
}

void readMax30102() {
  particleSensor.check();
  while (particleSensor.available()) {
    uint32_t red = particleSensor.getFIFORed();
    uint32_t ir = particleSensor.getFIFOIR();
    particleSensor.nextSample();
    lastIr = ir;
    bool on = ir > FINGER_IR_MIN;
    if (state != FINGER || !on || !fingerOn) continue;
    if (millis() < settleUntil) {   // settling: no results, but the brightness may adjust
      if (AUTO_BRIGHTNESS) agcSample(ir);
      continue;
    }
    accRed += red;
    accIr += ir;
    if (++accN == 4) {              // Maxim's algorithm: 25 averaged samples a second
      addMaxSample(accRed / 4, accIr / 4);
      accRed = accIr = 0;
      accN = 0;
    }
    dalilSample(red, ir);           // the Dalil algorithm: every sample
  }
}

// Pulse Sensor: 100 samples a second; a beat is the signal rising through the middle of its 2-second range.
void readPulseSensor() {
  unsigned long now = millis();
  if (now - lastPulseSampleMs < 10) return;
  lastPulseSampleMs = now;
  int v = analogRead(PIN_PULSE);
  pulseRing[pulseIndex] = v;
  pulseIndex = (pulseIndex + 1) % PULSE_WINDOW;
  if (pulseFilled < PULSE_WINDOW) pulseFilled++;
  int mn = 4095, mx = 0;
  for (int i = 0; i < pulseFilled; i++) { mn = min(mn, pulseRing[i]); mx = max(mx, pulseRing[i]); }
  pulseAmplitude = mx - mn;
  int mid = (mn + mx) / 2;
  if (pulsePrev < mid && v >= mid && pulseAmplitude > PULSE_MIN_AMPLITUDE && (lastBeatMs == 0 || now - lastBeatMs >= 300)) {
    if (lastBeatMs != 0) {
      beatIntervals[beatIndex] = now - lastBeatMs;
      beatIndex = (beatIndex + 1) % 8;
      if (beatCount < 8) beatCount++;
    }
    lastBeatMs = now;
  }
  pulsePrev = v;
}

bool pulseFingerOn() { return pulseAmplitude > PULSE_MIN_AMPLITUDE && lastBeatMs != 0 && millis() - lastBeatMs < 2000; }

// Once a second with the finger on: HR from the median of the last beat intervals.
void pulseResult() {
  if (millis() - lastPulseResultMs < 1000) return;
  lastPulseResultMs = millis();
  if (beatCount < 4) return;
  int hr = (int)(60000UL / medianUL(beatIntervals, beatCount));
  resultCount++;
  if (hr >= 40 && hr <= 180 && goodCount < MAX_GOOD) {
    goodHr[goodCount] = hr;
    goodCount++;
  }
  if (goodCount > 0) hrValue = robustCenter(goodHr, goodCount, HR_OUTLIER_MIN_BAND);
  qValue = (float)goodCount / (float)resultCount;
}

bool currentFinger() {
  if (hasMax) return lastIr > FINGER_IR_MIN;
  if (usePulse) return pulseFingerOn();
  return false;
}

// =====================================================================================================
// The steps, run on every pass of loop()
// =====================================================================================================

int secondsLeftUp(long msLeft) { return msLeft <= 0 ? 0 : (int)((msLeft + 999) / 1000); }

// "# maxim hr=72 spo2=97 q=0.80 n=14 | dalil hr=73 spo2=98 q=0.90 n=20 | led=60": both algorithms side by side.
// Lines starting with # are debug lines: the app ignores them (contract 9.5).
void printShadow() {
  const Results *both[2] = {&maximRes, &dalilRes};
  char part[2][48];
  for (int k = 0; k < 2; k++) {
    const Results &r = *both[k];
    if (r.good > 0) {
      snprintf(part[k], sizeof part[k], "hr=%d spo2=%d q=%.2f n=%d", robustCenter(r.hr, r.good, HR_OUTLIER_MIN_BAND),
               robustCenter(r.spo2, r.good, SPO2_OUTLIER_MIN_BAND), (float)r.good / (float)r.all, r.good);
    } else {
      snprintf(part[k], sizeof part[k], "hr=-- spo2=-- n=0/%d", r.all);
    }
  }
  char line[160];
  snprintf(line, sizeof line, "# maxim %s | dalil %s | led=%d", part[0], part[1], ledAmp);
  Serial.println(line);
}

void runFinger() {
  unsigned long now = millis();
  bool on = currentFinger();
  if (on && !fingerOn) {  // finger came back: the buffers restart empty, and the first seconds are ignored
    resetFingerData();
    lastFingerTick = now;
    settleUntil = now + FINGER_SETTLE_MS;
    lastWindowDc = 0;
    fingerHint = HINT_NONE;
    dalilReset();
    accRed = accIr = 0;
    accN = 0;
    agcSum = 0;
    agcN = 0;
  }
  if (!on && fingerOn && AUTO_BRIGHTNESS) setLed(LED_DEFAULT);  // finger lifted: back to the default brightness
  if (!on && fingerOn) noFingerSince = now;
  fingerOn = on;
  if (fingerOn && now >= settleUntil) {  // the settling time doesn't count towards the 20 s
    fingerOnMs += now - lastFingerTick;
    if (usePulse) pulseResult();
  }
  lastFingerTick = now;

  int left = secondsLeftUp((long)FINGER_SECONDS * 1000L - (long)fingerOnMs);

  // Blue, blinking (500 ms on, 500 ms off).
  showColour(((now - stepStartMs) / 500) % 2 == 0 ? C_BLUE : C_OFF);

  if (!fingerOn) {
    setScreen("Finger in slot");
  } else {
    char a[22], b[22], h[6], s[6];
    if (hrValue >= 0) snprintf(h, sizeof h, "%d", hrValue); else strcpy(h, "--");
    if (spo2Value >= 0) snprintf(s, sizeof s, "%d%%", spo2Value); else strcpy(s, "--");
    snprintf(a, sizeof a, "HR %s  SpO2 %s", h, s);
    snprintf(b, sizeof b, now < settleUntil ? "Settling..." : "Keep still  %ds", left);
    setScreen(a, b, fingerHint == HINT_STILL ? "! Keep still" : fingerHint == HINT_LIGHT ? "! Rest finger lightly" : "");
  }

  if (now - lastLineMs >= 1000) {
    lastLineMs = now;
    sendMeasure("finger", hrValue, spo2Value, NAN, fingerOn, qValue, left);
    if (SHADOW_DEBUG && hasMax) printShadow();
  }

  if (fingerOnMs >= (unsigned long)FINGER_SECONDS * 1000UL) {
    if (goodCount >= MIN_GOOD_RESULTS) startForehead();
    else failCheck("bad_signal", "Weak signal", "Weak signal");
    return;
  }
  if ((!fingerOn && now - noFingerSince >= (unsigned long)NO_FINGER_TIMEOUT_S * 1000UL) ||
      now - stepStartMs >= (unsigned long)FINGER_STEP_MAX_S * 1000UL) {
    failCheck("no_finger", "No finger detected", "No finger");
  }
}

// The sensor's object temperature assumes a perfect emitter (emissivity 1.0). Skin is about 0.98, and the sensor
// also sees some reflected room heat. Correct both in software with the sensor's own room (ambient) reading:
// T_skin^4 = (T_measured^4 - (1 - e) * T_room^4) / e, in kelvin. Nothing is written to the sensor's memory.
float skinTemperature() {
  float obj = mlx.readObjectTempC();
  float amb = mlx.readAmbientTempC();
  if (isnan(obj)) return NAN;
  if (isnan(amb) || SKIN_EMISSIVITY >= 0.999f) return obj;
  double to = obj + 273.15, ta = amb + 273.15;
  double t4 = (pow(to, 4) - (1.0 - SKIN_EMISSIVITY) * pow(ta, 4)) / SKIN_EMISSIVITY;
  if (t4 <= 0) return obj;
  return (float)(pow(t4, 0.25) - 273.15);
}

void runForehead() {
  unsigned long now = millis();
  if (now - lastTempReadMs >= 250) {
    lastTempReadMs = now;
    float t = skinTemperature();
    if (!isnan(t) && t >= TEMP_MIN_VALID && t <= TEMP_MAX_VALID) {
      if (firstForeheadMs == 0) firstForeheadMs = now;
      if (tempRunCount < 3) {
        tempRun[tempRunCount++] = t;
      } else {
        tempRun[0] = tempRun[1];
        tempRun[1] = tempRun[2];
        tempRun[2] = t;
      }
      if (tempRunCount == 3) {
        float avg = (tempRun[0] + tempRun[1] + tempRun[2]) / 3.0f;
        float spread = max(tempRun[0], max(tempRun[1], tempRun[2])) - min(tempRun[0], min(tempRun[1], tempRun[2]));
        if (isnan(bestTemp) || avg > bestTemp) bestTemp = avg;
        // Prefer readings that have stopped changing: the forehead is held still at the right distance.
        if (spread <= TEMP_STABLE_RANGE && (isnan(bestStableTemp) || avg > bestStableTemp)) bestStableTemp = avg;
        float use = isnan(bestStableTemp) ? bestTemp : bestStableTemp;
        tempValue = roundf(use * 10.0f) / 10.0f;
      }
    } else {
      tempRunCount = 0;  // "3 readings in a row": a non-forehead reading breaks the run
    }
  }
  int left = firstForeheadMs == 0 ? FOREHEAD_SECONDS : secondsLeftUp((long)FOREHEAD_SECONDS * 1000L - (long)(now - firstForeheadMs));
  char b[22];
  snprintf(b, sizeof b, "5 cm away  %ds", left);
  setScreen("Forehead to window", b);

  if (now - lastLineMs >= 1000) {
    lastLineMs = now;
    sendMeasure("forehead", hrValue, spo2Value, tempValue, currentFinger(), qValue, left);
  }

  bool done = (firstForeheadMs != 0 && now - firstForeheadMs >= (unsigned long)FOREHEAD_SECONDS * 1000UL) ||
              (firstForeheadMs == 0 && now - stepStartMs >= (unsigned long)FOREHEAD_TIMEOUT_S * 1000UL);
  if (done) finishCheck();
}

void runIdle() {
  unsigned long now = millis();
  if (errorUntil && now < errorUntil) {
    setScreen("Try again", errorReason);
  } else if (resultOnScreen && now < resultUntil) {
    setScreen("Dalil", resultLine, resultWord);
  } else {
    if (resultOnScreen) resultOnScreen = false;
    errorUntil = 0;
    setScreen("Dalil", "Press START");
  }
  // The result colour (or the app's LED command) stays for RESULT_SHOW_S, then the light goes off.
  if (shownColour != C_OFF && now >= colourUntil) {
    shownColour = C_OFF;
    showColour(C_OFF);
  }
  if (now - lastLineMs >= 1000) {
    lastLineMs = now;
    sendMeasure("idle", -1, -1, NAN, false, NAN, -1);
  }
}

// =====================================================================================================
// Commands from the app (section E) and the button
// =====================================================================================================

void handleCommand(char *raw) {
  // Trim spaces.
  while (*raw == ' ' || *raw == '\t') raw++;
  int n = strlen(raw);
  while (n > 0 && (raw[n - 1] == ' ' || raw[n - 1] == '\t')) raw[--n] = '\0';
  if (n == 0) return;
  char up[33];
  for (int i = 0; i <= n && i < 32; i++) up[i] = toupper((unsigned char)raw[i]);
  up[min(n, 32)] = '\0';

  bool checking = state == FINGER || state == FOREHEAD;
  bool valid = true;
  if (strcmp(up, "PING") == 0) {
    sendHello();
  } else if (strcmp(up, "START") == 0) {
    if (checking) sendErrorLine("busy", "Check already running");
    else startCheck();
  } else if (strcmp(up, "STOP") == 0) {
    if (checking) cancelCheck();
  } else if (strncmp(up, "LED ", 4) == 0 &&
             (strcmp(up + 4, "GREEN") == 0 || strcmp(up + 4, "AMBER") == 0 || strcmp(up + 4, "RED") == 0 || strcmp(up + 4, "OFF") == 0)) {
    if (!checking) {
      const char *c = up + 4;
      Colour col = strcmp(c, "GREEN") == 0 ? C_GREEN : strcmp(c, "AMBER") == 0 ? C_AMBER : strcmp(c, "RED") == 0 ? C_RED : C_OFF;
      shownColour = col;
      showColour(col);
      colourUntil = millis() + (unsigned long)RESULT_SHOW_S * 1000UL;
      if (resultOnScreen) strcpy(resultWord, col == C_OFF ? "" : wordFor(col));
      if (col == C_OFF) colourUntil = 0;
    }
  } else {
    valid = false;
    char msg[21];
    int j = 0;
    for (int i = 0; raw[i] && j < 20; i++) if (raw[i] != '"' && raw[i] != '\\') msg[j++] = raw[i];
    msg[j] = '\0';
    sendErrorLine("unknown_cmd", msg);
  }
  if (valid) {
    lastCommandMs = millis();
    commandSeen = true;
  }
}

void readSerial() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      cmdBuf[cmdLen] = '\0';
      if (cmdLen > 0) handleCommand(cmdBuf);
      cmdLen = 0;
      cmdOverflow = false;
    } else if (cmdLen < 32) {
      cmdBuf[cmdLen++] = c;
    } else {
      cmdOverflow = true;  // longer than 32 characters: the rest is ignored
    }
  }
}

void readButton() {
  bool r = digitalRead(PIN_BUTTON);
  unsigned long now = millis();
  if (r != buttonLastRead) {
    buttonLastRead = r;
    buttonChangedMs = now;
  }
  if (now - buttonChangedMs >= 50 && r != buttonStable) {
    buttonStable = r;
    if (buttonStable == LOW) {  // act on the press
      if (state == IDLE) startCheck();
      else cancelCheck();
    }
  }
}

// =====================================================================================================
// setup() and loop()
// =====================================================================================================

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  buzzer(false);
  setRgb(0, 0, 0);

  // One shared bus at 100 kHz (the thermometer fails at 400 kHz). Free it first in case a sensor is stuck.
  i2cBusRecover(PIN_SDA, PIN_SCL);
  if (MLX_ON_WIRE1) i2cBusRecover(18, 19);
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(100000);
  if (MLX_ON_WIRE1) {
    Wire1.begin(18, 19);
    Wire1.setClock(100000);
  }

  // Which parts answer? A missing part skips its step instead of breaking the check.
  delay(50);  // give the parts a moment after power-up or a restart
  hasOled = i2cAnswersRetry(Wire, 0x3C);
  if (hasOled) hasOled = oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  hasMax = false;
  if (i2cAnswersRetry(Wire, 0x57)) {
    for (int i = 0; i < 3 && !hasMax; i++) {
      hasMax = particleSensor.begin(Wire, I2C_SPEED_STANDARD);
      if (!hasMax) delay(50);
    }
  }
  // 100 samples a second (no averaging in the sensor), red + IR. Maxim's algorithm gets the average of every 4.
  if (hasMax) particleSensor.setup(LED_DEFAULT, 1, 2, 100, 411, 4096);
  ledAmp = LED_DEFAULT;
  usePulse = !hasMax && PULSE_SENSOR_FALLBACK;
  if (usePulse) analogReadResolution(12);
  TwoWire &mlxBus = MLX_ON_WIRE1 ? Wire1 : Wire;
  hasMlx = i2cAnswersRetry(mlxBus, 0x5A) && mlx.begin(0x5A, &mlxBus);

  // D1 BOOT: name, which sensors work, the light flashes red-green-blue, one short beep.
  setScreen("Dalil", hasMax ? "PULSE OK" : (usePulse ? "PULSE BACKUP" : "PULSE MISSING"), hasMlx ? "TEMP OK" : "TEMP MISSING");
  lastDrawMs = 0;
  updateScreen();
  showColour(C_RED); delay(200);
  showColour(C_GREEN); delay(200);
  showColour(C_BLUE); delay(200);
  showColour(C_OFF);
  beep(100);
  sendHello();
  delay(1000);  // let people read the sensor status
  state = IDLE;
  lastLineMs = millis();
}

void loop() {
  readSerial();
  readButton();
  if (hasMax) readMax30102();
  if (usePulse) readPulseSensor();

  switch (state) {
    case IDLE: runIdle(); break;
    case FINGER: runFinger(); break;
    case FOREHEAD: runForehead(); break;
  }
  updateScreen();
  delay(2);
}
