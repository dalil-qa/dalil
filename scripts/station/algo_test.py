#!/usr/bin/env python3
"""Host test for the Dalil heart-rate / SpO2 algorithm (firmware/dalil_station). No board needed.

It copies the algorithm's functions out of the .ino, feeds them synthetic pulse signals with a known heart rate and
red/infrared ratio (with noise and slow drift), and checks the answers. Needs a C++ compiler (clang++ or g++).
Run from the dalil folder:  python3 scripts/station/algo_test.py
"""
import os, subprocess, sys, tempfile

INO = os.path.join(os.path.dirname(__file__), '..', '..', 'firmware', 'dalil_station', 'dalil_station.ino')
FUNCS = ["int median(const int *values, int n)", "int robustCenter(const int *values, int n, int minBand)",
         "void clearResults(Results &r)", "void addResult(Results &r, bool valid, int hr, int spo2)",
         "void dalilReset()", "void dalilBeat(long a, long b)", "void dalilSample(uint32_t red, uint32_t ir)"]

def grab(src, sig):
    i = src.index(sig); j = src.index('{', i); depth = 0; k = j
    while True:
        if src[k] == '{': depth += 1
        elif src[k] == '}':
            depth -= 1
            if depth == 0: return src[i:k + 1]
        k += 1

HEAD = r'''
// Host test for the Dalil algorithm: synthetic PPG with a known heart rate and red/IR ratio.
#include <cstdio>
#include <cstdint>
#include <cmath>
#include <cstdlib>
#include <algorithm>
using std::min; using std::max;
const int MAX_GOOD = 60;
const int HR_OUTLIER_MIN_BAND = 6, SPO2_OUTLIER_MIN_BAND = 2;
const bool USE_DALIL_ALGORITHM = false;
struct Results { int hr[MAX_GOOD]; int spo2[MAX_GOOD]; int good; int all; };
Results maximRes, dalilRes;
void publish(const Results &) {}
const int DW = 256;
uint32_t dRawIr[DW], dRawRed[DW];
unsigned long dN = 0; bool dInit = false;
float dDcIr = 0, dLp1 = 0, dLp2 = 0, dPrev1 = 0, dPrev2 = 0, dEnvelope = 0;
long dLastPeak = -1; int dRecent[8]; int dRecentCount = 0, dRecentIndex = 0;
'''
TAIL = r'''// One reflectance PPG cycle: a sharp dip (systole) and slow recovery, like a real pulse wave.
double pulseShape(double phase) { return phase < 0.15 ? phase / 0.15 : 1.0 - (phase - 0.15) / 0.85; }

void run(double bpm, double ratio, double noise, double drift, const char *name) {
  clearResults(dalilRes); dalilReset();
  srand(7);
  double dcIr = 150000, dcRed = 120000, piIr = 0.01;    // 1 % pulse on infrared
  double piRed = piIr * ratio;                          // R = (AC/DC red) / (AC/DC ir)
  for (int i = 0; i < 2000; i++) {                      // 20 s at 100 samples/s
    double t = i / 100.0, phase = fmod(t * bpm / 60.0, 1.0);
    double w = drift * sin(2 * M_PI * 0.1 * t);         // slow breathing / pressure drift
    double nIr = noise * ((rand() / (double)RAND_MAX) - 0.5), nRed = noise * ((rand() / (double)RAND_MAX) - 0.5);
    double ir = dcIr * (1 + w) * (1 - piIr * pulseShape(phase)) + nIr;
    double red = dcRed * (1 + w) * (1 - piRed * pulseShape(phase)) + nRed;
    dalilSample((uint32_t)red, (uint32_t)ir);
  }
  double expSpo2 = std::min(100.0, -45.060 * ratio * ratio + 30.354 * ratio + 94.845);
  int hr = dalilRes.good ? robustCenter(dalilRes.hr, dalilRes.good, HR_OUTLIER_MIN_BAND) : -1;
  int sp = dalilRes.good ? robustCenter(dalilRes.spo2, dalilRes.good, SPO2_OUTLIER_MIN_BAND) : -1;
  bool ok = abs(hr - (int)lround(bpm)) <= 3 && abs(sp - (int)lround(expSpo2)) <= 2;
  printf("%s %-34s expected hr %3.0f spo2 %3.0f | got hr %3d spo2 %3d | good beats %d/%d\n", ok ? "PASS" : "FAIL", name, bpm, expSpo2, hr, sp, dalilRes.good, dalilRes.all);
}
int main() {
  run(72, 0.50, 0, 0, "72 bpm, clean, R 0.50");
  run(72, 0.50, 400, 0.002, "72 bpm, noise + drift, R 0.50");
  run(55, 0.60, 300, 0.002, "55 bpm, noise + drift, R 0.60");
  run(110, 0.70, 300, 0.003, "110 bpm, noise + drift, R 0.70");
  run(72, 0.90, 300, 0.002, "72 bpm, low oxygen, R 0.90");
}
'''

src = open(INO, encoding='utf-8').read()
code = HEAD + "\n\n".join(grab(src, f) for f in FUNCS) + "\n\n" + TAIL
with tempfile.TemporaryDirectory() as d:
    cpp, exe = os.path.join(d, 'algo_test.cpp'), os.path.join(d, 'algo_test')
    open(cpp, 'w').write(code)
    cxx = 'clang++' if subprocess.call(['which', 'clang++'], stdout=subprocess.DEVNULL) == 0 else 'g++'
    subprocess.check_call([cxx, '-std=c++17', '-O2', '-o', exe, cpp])
    out = subprocess.run([exe], capture_output=True, text=True).stdout
    print(out, end='')
    sys.exit(1 if 'FAIL' in out else 0)
