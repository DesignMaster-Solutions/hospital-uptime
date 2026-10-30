# Builds the Hospital Uptime demo: real captures of the live app, real npm test, `say` narration -> docs/demo.mp4
import subprocess, pathlib
from PIL import Image, ImageDraw, ImageFont
V = pathlib.Path(__file__).parent
R = V.parent
W, H = 1920, 1080
F = "/System/Library/Fonts/HelveticaNeue.ttc"
SANS, SUB = ImageFont.truetype(F, 62, index=1), ImageFont.truetype(F, 36)
MONO = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 26)
tests = [l.replace("ℹ ", "").split(" (")[0] for l in
         subprocess.run(["npm", "test"], cwd=R, capture_output=True, text=True).stdout.splitlines()
         if l.startswith(("✔", "✖", "ℹ pass", "ℹ fail"))]
S = [
 ("Hospital Uptime", ["Tiered solar, battery and generator plans", "for hospitals with 8 to 20 hours of outage a day.", "",
   "hospital-uptime.designmaster.workers.dev", "", "Design Master Solutions LLC · Anneru Global Energy Hackathon"], None, None,
  "Hospital Uptime. A planner for hospitals that lose grid power eight to twenty hours a day, so oxygen, vaccine fridges and I C U monitors never go dark."),
 ("1. List the equipment, by tier", ["Tier 1  life-critical", "never shed", "", "Tier 2  essential", "", "Tier 3  comfort",
   "shed first,", "never on diesel"], None, ["eq.png"],
  "Start with the equipment. Each line gets a tier. Tier one is life critical and is never shed. Tier two is essential. Tier three, fans and air conditioning, is shed first and never burns diesel."),
 ("2. Describe the grid", ["Sample hospital:", "14 h outage from 18:00,", "5 peak sun hours,", "diesel price, finance terms.", "",
   "Every price is an editable", "planning assumption."], None, ["grid.png"],
  "Then the grid. Our sample hospital loses power fourteen hours a day, from six in the evening. Peak sun hours, diesel price and finance terms are editable assumptions, not quotes."),
 ("Solar alone is not safe", ["No battery, no generator:", "", "life-critical loads lose", "33.2 kWh a day.", "",
   "The red bars are what", "goes dark."], None, ["broken.png"],
  "Take away the battery and the generator, and the plan says so in red: life critical loads lose thirty three kilowatt hours a day. Every red bar is a patient load that goes dark."),
 ("3. Re-size automatically", ["Battery 73.4 kWh,", "small generator as last line.", "", "Tiers 1-2 stay on all 14 h.",
   "Diesel: 21 -> 2.5 L/day.", "Payback: 4.3 years."], None, ["fixed.png"],
  "One click re sizes it. Solar carries the day, the battery carries the night, and a small generator only covers tiers one and two. Life critical and essential loads stay on through all fourteen hours. Diesel drops from twenty one litres a day to two and a half, and the system pays back in about four years."),
 ("Tested", [], ["$ npm test"] + tests + ["",
   "Model: one continuous outage block (worst case), half-sine solar x 0.75,",
   "3 simulated days, the 3rd reported. Open source, MIT."], None,
  "The sizing rules are tested: the auto sized system never drops a life critical load, comfort loads are shed first and never get diesel, and the hybrid always burns less than generator only."),
 ("Hospital Uptime", ["A plan an administrator can take to an installer and a lender.", "",
   "hospital-uptime.designmaster.workers.dev", "github.com/DesignMaster-Solutions/hospital-uptime  (MIT)"], None, None,
  "A plan a hospital administrator can print and take to an installer and a lender. It is live at hospital uptime dot designmaster dot workers dot dev, and open source. Thanks for watching."),
]
parts = []
for i, (title, sub, mono, shots, narr) in enumerate(S):
    im = Image.new("RGB", (W, H), "#0f1b2d"); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 10], fill="#2563eb")
    d.text((110, 80), title, font=SANS, fill="white")
    y = 230
    for l in sub: d.text((110, y), l, font=SUB, fill="#dbe5f3"); y += 60
    if mono:
        d.rounded_rectangle([90, y - 20, W - 90, min(H - 90, y + 46 * len(mono) + 20)], 16, fill="#060c16")
        for l in mono:
            col = "#86efac" if l.startswith(("$", "✔", "pass")) else "#fca5a5" if l.startswith(("✖", "fail 1")) else "#e2e8f0"
            d.text((120, y), l, font=MONO, fill=col); y += 46
    for s in shots or []:
        p = Image.open(V/s).convert("RGB"); p.thumbnail((1120, 820))
        x = W - 90 - p.width
        im.paste(p, (x, 180)); d.rectangle([x - 2, 178, x + p.width + 1, 181 + p.height], outline="#33507a", width=2)
    d.text((110, H - 70), "Hospital Uptime · Design Master Solutions LLC", font=MONO, fill="#7f93b0")
    png, aiff, mp4 = V/f"s{i}.png", V/f"s{i}.aiff", V/f"s{i}.mp4"
    im.save(png)
    subprocess.run(["say", "-v", "Samantha", "-r", "186", "-o", aiff, narr], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", png, "-i", aiff, "-af", "apad=pad_dur=0.6",
                    "-shortest", "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", "30",
                    "-c:a", "aac", "-ar", "48000", mp4], check=True)
    parts.append(mp4)
(V/"list.txt").write_text("".join(f"file '{p}'\n" for p in parts))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", V/"list.txt", "-c", "copy",
                "-movflags", "+faststart", R/"docs/demo.mp4"], check=True)
