# Hospital Uptime

**Live:** https://hospital-uptime.designmaster.workers.dev

Anneru Global Energy Hackathon 2026 · track: Digital Solutions, Apps & AI/ML Tools · pillar: **Availability**.

> Design a scalable, low-maintenance energy system that guarantees uninterrupted 24-hour power for Nigerian hospitals experiencing 8–20 hours of daily grid outages, ensuring critical medical equipment, refrigeration, lighting, and life-support systems never fail due to electricity unavailability.

Hospital Uptime turns that problem into a plan a hospital administrator can take to an installer and a lender:

1. **List the equipment** and put each item in a tier: 1 life-critical (oxygen, vaccine fridges, ICU, theatre), 2 essential (lighting, lab, water, records), 3 comfort (fans, AC).
2. **Set the grid**: outage hours per day, when they start, peak sun hours, diesel price.
3. **Get a system**: solar kWp, battery kWh and a backup generator, auto-sized or typed in.
4. **See it run hour by hour**: which source carries the load each hour, battery charge, and what is shed. Tier 1 never goes dark; tier 3 is shed first and never burns diesel.
5. **See the money**: up-front cost, monthly payment over the finance term, diesel saved per month, payback. Print the plan.

## Why tiers instead of one big generator

Most facilities run every load on a diesel genset for every outage hour. The sample hospital in the app (10 lines of equipment, 14 h outage from 18:00) burns ~21 L/day that way. Sizing storage for only tiers 1-2, letting solar carry the day and keeping a small generator as the last line for life-critical loads, drops that to ~2.5 L/day in the simulation, with zero life-critical or essential energy unserved. The generator shrinks from "carries the hospital" to "4 kW that runs a few hours".

## Model

- Each equipment line becomes an average power (W x h / 24) by tier.
- The outage is one continuous block per day (worst case for storage), wrapping past midnight.
- Solar: half-sine 06:00-18:00 that sums to the peak sun hours, times a 0.75 performance ratio.
- Grid hours: grid carries everything and recharges the battery (0.25C).
- Outage hours: for tier 1, then 2, then 3: solar, then battery, then generator (tiers 1-2 only).
- Three days are simulated; the third is reported (battery state settled).
- Auto-size: PV produces the daily outage energy of tiers 1-2; battery holds one full outage block of tiers 1-2 at 80% DoD; generator = 1.25 x tier-1 power, for cloudy days.

All prices are editable planning assumptions, not quotes. It is a planning tool, not an engineering stamp: surge loads, cabling and protection need a licensed installer.

## Run

```bash
npm test                       # node --test, no dependencies
npx wrangler dev               # http://localhost:8787
```

`public/sizing.js` is pure (no DOM) and shared by the page and the tests.

## Use of AI

Built with AI coding assistance (Claude Code) for implementation; the problem framing, tiering rule and sizing method are documented above and checked by tests.

## License

MIT © Design Master Solutions LLC
