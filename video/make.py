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
 ("Who built it", ["Alan De Bortolo", "Founder, Design Master Solutions LLC", "Solo entry", "", "Software for clinics, stone shops", "and small businesses since 2004."], None, ["alan.jpg"],
  "I'm Alan De Bortolo, founder of Design Master Solutions, and this is a solo entry. My company builds software for clinics and small businesses, and I built Hospital Uptime for this hackathon's availability pillar."),
 ("The problem", ["Nigerian hospitals lose grid power", "8 to 20 hours a day.", "", "The usual answer: one big diesel genset", "for every load, every outage hour.", "",
   "Expensive, fuel-dependent, and when it", "fails, oxygen and vaccine fridges fail too."], None, None,
  "The brief: hospitals in Nigeria lose grid power eight to twenty hours a day. The usual answer is one big diesel generator that carries every load, from the oxygen concentrator to the office air conditioner, for every hour of outage. That burns money and fuel, and when the generator or the fuel supply fails, the life critical equipment fails with it. Administrators need a plan they can defend, not a guess."),
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
 ("4. Stress-test it", ["Same system, 8 / 12 / 16 / 20 h outages,", "normal sun and a cloudy day", "(half the sun).", "",
   "Tiers 1-2 stay on in all 8 cases.", "Diesel 0 to 4.4 L/day.", "Only comfort load is shed."], None, ["stress.png"],
  "A plan sized for one day is not enough, so the app stress tests the same system across the brief's whole range: eight, twelve, sixteen and twenty hour outages, on a normal day and on a cloudy day with half the sun. In all eight cases, tiers one and two stay on. Diesel stays between zero and four point four litres a day. Only the comfort tier absorbs the bad days, up to twelve kilowatt hours on a twenty hour cloudy day."),
 ("Who goes dark first", ["A written shedding order the staff", "can follow during an outage.", "", "Comfort first, never on diesel.",
   "Essential next.", "Life-critical never."], None, ["shed.png"],
  "The plan also writes the load shedding order in plain language, so the night shift knows what to switch off first: comfort loads, then essential ones, and life critical equipment never. The generator only exists for tiers one and two."),
 ("5. The money", ["Up-front cost, monthly payment", "over the finance term, diesel saved", "per month, simple payback.", "",
   "4.3 years for the sample hospital.", "Print the plan for an installer", "and a lender."], None, ["money.png"],
  "Then the money. The plan shows the up front cost, the monthly payment over a five year finance term, the diesel saved every month and the simple payback, four point three years for the sample hospital. One button prints it, so an administrator can take it to an installer for a quote and to a lender for financing."),
 ("How the model works", ["Load = W x h / 24, grouped by tier.", "Outage = one continuous block (worst case).", "Solar = half-sine 06-18 x 0.75.",
   "Dispatch per tier: solar, battery, generator.", "3 simulated days, the 3rd reported.", "Prices are editable assumptions, not quotes."], None, None,
  "Under the hood the model is deliberately simple and transparent. Each piece of equipment becomes an average load by tier. The outage is one continuous block per day, which is the worst case for storage. Solar follows a half sine curve with a seventy five percent performance ratio. During outage hours each tier draws from solar, then the battery, then the generator, and three days are simulated so the battery state settles. It is a planning tool, not an engineering stamp: a licensed installer still checks surge loads, cabling and protection."),
 ("Tested", [], ["$ npm test"] + tests + ["",
   "Model: one continuous outage block (worst case), half-sine solar x 0.75,",
   "3 simulated days, the 3rd reported. Open source, MIT."], None,
  "The sizing rules are tested: the auto sized system never drops a life critical load, comfort loads are shed first and never get diesel, and the hybrid always burns less than generator only."),
 ("What's next, 6 to 18 months", ["Pilot with one hospital: real meter data", "instead of typed equipment lists.",
   "Installer quotes plugged into the costs.", "Lender-ready export.", "", "Disclosure: repo started Oct 29, 22:06 EDT;",
   "built with Claude Code; narration is synthetic."], None, None,
  "Next, within six to eighteen months: a pilot with one hospital, importing real meter data instead of a typed equipment list, real installer quotes in the cost model, and an export a lender can underwrite. For full disclosure, the repository started on October twenty ninth at ten oh six p m Eastern time, I built it with Claude Code as a coding assistant, and this narration is a synthetic voice."),
 ("Hospital Uptime", ["A plan an administrator can take to an installer and a lender.", "",
   "hospital-uptime.designmaster.workers.dev", "github.com/DesignMaster-Solutions/hospital-uptime  (MIT)", "", "Alan De Bortolo · Design Master Solutions LLC"], None, None,
  "A plan a hospital administrator can print and take to an installer and a lender. It is live at hospital uptime dot designmaster dot workers dot dev, and open source under the M I T license. I'm Alan De Bortolo. Thanks for watching."),
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
        p = Image.open(V/s).convert("RGB"); k = min(980 / p.width, 820 / p.height)
        p = p.resize((round(p.width * k), round(p.height * k)), Image.LANCZOS)
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
