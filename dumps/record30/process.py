import json

with open("hexraw.json", "r") as f:
    vals = json.load(f)
    vals = list(map(lambda s: int(s[-2:] + s[0:2], 16), vals))

i = 0
while i < len(vals) - 1:
    assert vals[i] > vals[i + 1]
    i += 1


#####
#
# first (29:59) = 11836
# last (00:00)  = 7965
#
# range = 11836 - 7965
# = 3871
#
# divisions = 29 * 60 + 59
# = 1799
#
# step = range / divisions
# = 3871 / 1799
# = 2.151750972762646
#
#####

first = vals[0]
last = vals[-1]
range = first - last
divisions = 29 * 60 + 59
step = range / divisions


def toMMSS(v):
    
    mins = v // 60
    mins_s = str(int(mins)).zfill(2)

    secs = v % 60
    secs_s = str(round(secs)).zfill(2)

    return f"{mins_s}:{secs_s}"


def method(val):
    a = (val - last) / step
    return (val, toMMSS(a),)

for val in vals:
    # print(bin(val)[2:].zfill(16))
    print(*method(val))

print("\n\n", *method(vals[0]), "\n\n", *method(vals[-1]))

# Desired output = time remaining or time elapsed
# 29:59
