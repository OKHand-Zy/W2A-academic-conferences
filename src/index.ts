import { defineSensor } from "@world2agent/sdk/sensor";
import { createSignal } from "@world2agent/sdk";
import { z } from "zod";
import fetch from "node-fetch";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const STATE_FILE = join(process.cwd(), "state.json");
const CHECK_INTERVAL = 6 * 60 * 60 * 1000;

const OPENREVIEW_VENUES: Record<string, string> = {
  ICLR: "ICLR.cc",
  NeurIPS: "NeurIPS.cc",
  ICML: "ICML.cc",
};

type Checker = (year: number) => Promise<{ available: boolean; url: string }>;

const CONFERENCES: { name: string; check: Checker }[] = [
  ...Object.entries(OPENREVIEW_VENUES).map(([conf, venue]) => ({
    name: conf,
    check: async (year: number) => {
      const res = await fetch(
        `https://api2.openreview.net/notes?invitation=${encodeURIComponent(`${venue}/${year}/Conference/-/Acceptance`)}&limit=1`
      );
      if (!res.ok) throw new Error(`OpenReview HTTP ${res.status}`);
      const json = (await res.json()) as { count?: number };
      return {
        available: (json.count ?? 0) > 0,
        url: `https://openreview.net/group?id=${venue}/${year}/Conference`,
      };
    },
  })),

  ...["acl", "emnlp", "naacl", "aacl"].map((conf) => ({
    name: conf.toUpperCase(),
    check: async (year: number) => {
      const url = `https://aclanthology.org/events/${conf}-${year}/`;
      const res = await fetch(url);
      return { available: res.ok, url };
    },
  })),

  {
    name: "AAAI",
    check: async (year: number) => {
      const url = `https://ojs.aaai.org/index.php/AAAI/issue/view/${year}`;
      const res = await fetch(url);
      return { available: res.ok, url };
    },
  },

  {
    name: "INTERSPEECH",
    check: async (year: number) => {
      const url = `https://www.isca-archive.org/interspeech_${year}/`;
      const res = await fetch(url);
      return { available: res.ok, url };
    },
  },

  ...["ICASSP", "SLT"].map((conf) => ({
    name: conf,
    check: async (year: number) => {
      const res = await fetch(
        `https://ieeexplore.ieee.org/rest/search?queryText=${conf}&refinements=ContentType:Conferences&ranges=${year}_${year}_Year&pageSize=1`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error(`IEEE HTTP ${res.status}`);
      const json = (await res.json()) as { totalRecords?: number };
      return {
        available: (json.totalRecords ?? 0) > 0,
        url: `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${conf}&refinements=ContentType:Conferences&ranges=${year}_${year}_Year`,
      };
    },
  })),
];

interface State {
  year: number;
  notified: Record<string, boolean>;
}

function loadState(year: number): Record<string, boolean> {
  if (!existsSync(STATE_FILE)) return {};
  try {
    const state: State = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    if (state.year !== year) return {}; // 跨年自動清除
    return state.notified;
  } catch {
    return {};
  }
}

function saveState(year: number, notified: Record<string, boolean>) {
  writeFileSync(STATE_FILE, JSON.stringify({ year, notified }, null, 2));
}

export default defineSensor({
  id: "@your-scope/sensor-academic-conferences",
  version: "0.1.0",
  source_type: "academic",
  auth: { type: "none" },
  configSchema: z.object({}),

  async start(ctx) {
    async function poll() {
      const year = new Date().getFullYear(); // 每次 poll 重新取得，正確處理跨年
      const state = loadState(year);

      for (const conf of CONFERENCES) {
        if (state[conf.name]) continue;

        try {
          const { available, url } = await conf.check(year);
          if (!available) continue;

          await ctx.emit(
            createSignal(ctx.sensor, {
              event: {
                type: "academic.conference.papers_released",
                occurred_at: Date.now(),
                summary: `${conf.name} ${year} accepted papers are now publicly available at ${url}`,
              },
              source_event: {
                schema: {
                  type: "object",
                  properties: {
                    conference: { type: "string", description: "Conference name" },
                    year: { type: "integer", description: "Conference year" },
                    url: { type: "string", description: "URL to the proceedings" },
                  },
                  required: ["conference", "year", "url"],
                },
                data: { conference: conf.name, year, url },
              },
            })
          );

          state[conf.name] = true;
        } catch (e) {
          console.error(`[${conf.name}] check failed:`, e);
        }
      }

      saveState(year, state);
    }

    await poll();
    const timer = setInterval(poll, CHECK_INTERVAL);
    return () => clearInterval(timer);
  },
});
