/* eslint-disable no-unused-vars */
import { schedule } from "node-cron";
import StatsModule, { GraphType } from "./StatsModule";

export type PossibleStats = "cpu" | "ram" | "servers" | "users" | "commands" | "errors";

type EnabledStats = {
	[key in PossibleStats]?: boolean;
};

/*export interface Stats {
	timestamp?: number;
	cpu?: number;
	ram?: number;
	servers?: number;
	users?: number;
	commands?: Map<string, CommandInformation>;
	errors?: number;
}*/

export type Stats = {
	[key: string]: number | Map<string, unknown>;
};

export interface SavedStatsFormat {
	timestamp: number;
	stats: Stats;
}

export interface StatsManagerOptions {
	saveInterval?: number;
	enabledStats?: EnabledStats;
}

interface StatsAcquisition {
	(): Promise<SavedStatsFormat>;
}

const defaultStatsModule: StatsModule[] = [
	new StatsModule("cpu", { graphType: GraphType.LINE, dataType: "number" }),
	new StatsModule("ram", { graphType: GraphType.LINE, dataType: "number" }),
	new StatsModule("servers", { graphType: GraphType.LINE, dataType: "number" }),
	new StatsModule("users", { graphType: GraphType.LINE, dataType: "number" }),
	new StatsModule("commands", { graphType: GraphType.BAR, dataType: "map" }),
	new StatsModule("errors", { graphType: GraphType.LINE, dataType: "number" })
];

/**
 * Manages the stats of your discord bot.
 * @param {options} StatsManagerOptions The client to manage the stats of.
 * @returns {StatsManager} The stats manager.
 */

export default abstract class {
	saveInterval: number;
	enabledStats: EnabledStats;
	private _statsModules: StatsModule[];
	constructor(options: StatsManagerOptions) {
		this.saveInterval = options.saveInterval || 3_600_000;
		this.enabledStats = options.enabledStats || {};
		this._statsModules = [];
		this._init();
	}

	_init() {
		for (const module of defaultStatsModule) {
			const status = this.enabledStats[module.name as PossibleStats];
			if (status) this._statsModules.push(module);
		}
		console.log(`[StatsManager] Enabled stats: ${this._statsModules.map(m => m.name).join(", ")}`);
	}

	/*isModuleEnabled(name: string) {
		return this.statsModules.some(m => m.name === name);
	}*/

	get statsModules(): StatsModule[] {
		return this._statsModules;
	}

	findModule(name: string): StatsModule {
		return this._statsModules.find(m => m.name === name);
	}

	async start(returnedStatsFunction: StatsAcquisition): Promise<void> {
		schedule("*/15 * * * * *", async () => {
			const returnedStats = await returnedStatsFunction();

			console.debug("Schedule");

			if (isNaN(returnedStats?.timestamp)) returnedStats.timestamp = Date.now();

			// Saving new Data
			/*for (const [stat, status] of Object.entries(this.enabledStats) as [PossibleStats, boolean][]) {
				if (status && !returnedStats[stat])
					throw new Error(`The stat ${stat} is enabled but not returned by the stats acquisition function.`);
			}*/
			for (const module of this._statsModules) {
				const moduleStats = returnedStats.stats[module.name];
				if (!moduleStats) {
					throw new Error(
						`The stats ${module.name} is enabled but not returned by the stats acquisition function.`
					);
				}
				if (!module.validInputData(moduleStats)) {
					throw new Error(
						`The stats ${module.name} is provided but don't but not match the type ${module.dataType}.`
					);
				}
				if (isNaN(returnedStats.timestamp)) {
					throw new Error(`The timestamp ${returnedStats.timestamp} is not a valid timestamp.`);
				}
			}

			console.debug("4");
			await this.saveStats(returnedStats);

			// Supress useless data
			/*let count = -1;
			let cumStat: Stats = {};
			const data = await this.getStats();

			const last7Days = data.filter(
				d =>
					d.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000 && d.timestamp < Date.now() - 24 * 60 * 60 * 1000
			);
			const remainingData = sliceIntoChunks(last7Days, 4).every(d => {
				d.reduce((acc, prev) => AverageOfTwoStats(acc, prev), d[0]);
			});

			const dataToKeep = data.every(d => {
				if (d.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
					return false;
				} else if (d.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000) {
					count++;
					if (count === 0) cumStat = d;
					if (count % 4 === 0) {
						cumStat = d;
					} else if (count % 4) {
						cumStat = AverageOfTwoStats(cumStat, d);
					} else {
						count;
					}
				}
			});*/
			const oldData = (await this.getStats())
				.filter(d => d.timestamp < Date.now() - 28 * 24 * 60 * 60 * 1000)
				.map(d => d.timestamp);

			await this.deleteStats(oldData);
		});
	}

	abstract saveStats(stats: SavedStatsFormat): Promise<void>;

	abstract getStats(): Promise<SavedStatsFormat[]>;

	abstract deleteStats(timestamps: number[]): Promise<void>;
}

/*function AverageOfTwoStats(stats1: Stats, stats2: Stats) {
	return {
		timestamp: stats1?.timestamp || stats2?.timestamp,
		cpu: (stats1.cpu + stats2.cpu) / 2,
		ram: (stats1.ram + stats2.ram) / 2,
		servers: (stats1?.servers + stats2.servers) / 2,
		users: (stats1?.users + stats2.users) / 2,
		commands: new Map(
			[...stats1.commands, ...stats2.commands].map(([key, value]) => [
				key,
				{
					execution: value.execution + stats2.commands.get(key)?.execution,
					errors: value.errors + stats2.commands.get(key)?.errors
				}
			])
		),
		errors: stats1.errors + stats2.errors
	};
}

function sliceIntoChunks(arr: Array<Stats>, chunkSize: number) {
	const res = [];
	for (let i = 0; i < arr.length; i += chunkSize) {
		const chunk = arr.slice(i, i + chunkSize);
		res.push(chunk);
	}
	return res;
}*/