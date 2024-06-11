import * as fs from "fs";
import Color from "colorjs.io";
import * as filters from "./filters.js";

function read_json (file) {
	let contents = fs.readFileSync(file, "utf-8");
	return JSON.parse(contents);
}

let palettes = read_json("data/palette_metadata.json").filter(p => p.id);
let hues = {};

// Add palette.colors to each palette
for (let palette of palettes) {
	// Import colors
	let colors = read_json(`data/${palette.id}.json`);
	let ret = {};
	let other = {};

	palette.count = {hue: 0, neutral: 0};
	palette.levels = {
		min: Infinity, max: -Infinity,
		step: {min: Infinity, max: -Infinity},
		steps: {min: Infinity, max: -Infinity},
	};

	for (let hue in colors) {
		let value = colors[hue];
		let subColors = value && typeof value === "object" ? Object.values(value) : [value];

		if (subColors.length === 1) {
			// Single color, add to other
			other[hue] = subColors[0];
		}
		else {
			// Multiple colors, add to ret
			let hueColors = ret[hue] = {};
			palette.levels.steps.min = Math.min(palette.levels.steps.min, subColors.length);
			palette.levels.steps.max = Math.max(palette.levels.steps.max, subColors.length);

			let previousLevel;
			for (let level in value) {
				let color = value[level];
				ret[hue][level] = color;

				palette.levels.min = Math.min(palette.levels.min, level);
				palette.levels.max = Math.max(palette.levels.max, level);
				if (previousLevel !== undefined) {
					let step = Math.abs(previousLevel - level);
					palette.levels.step.min = Math.min(palette.levels.step.min, step);
					palette.levels.step.max = Math.max(palette.levels.step.max, step);
				}

				previousLevel = level;
			}

			if (!hues[hue]) {
				hues[hue] = {
					name: hue,
					type: undefined,
					hue: [],
					chroma: [],
					palettes: {},
				};
			}

			let colors = Object.values(hueColors).map(str => new Color(str).to("oklch"));
			let hueValues = colors.map(c => c.get("h")).filter(h => Number.isFinite(h)).map(h => h + 360);
			hues[hue].hue.push(...hueValues);
			hues[hue].chroma.push(...colors.map(c => c.get("c")).filter(c => Number.isFinite(c)));
			hues[hue].palettes[palette.id] = hueColors;
		}
	}

	if (Object.keys(other).length > 0) {
		// Add other last
		ret.other = other;
	}

	palette.colors = ret;
}

// Convert palettes from array to object
palettes = Object.fromEntries(palettes.map(p => [p.id, p]));

for (let hue in hues) {
	let data = hues[hue];

	for (let coord of ["hue", "chroma"]) {
		let values = data[coord];

		let min = filters.min(values);
		let max = filters.max(values);
		data[coord] = {
			min, max,
			midrange: (min + max) / 2,
			mean: filters.mean(values),
			median: filters.median(values),
			// values,
		};
	}

	data.palette_count = Object.keys(data.palettes).length;
	data.type = data.chroma.max > 0.05 ? "hue" : "neutral";
}

function sort_hues (obj) {
	return Object.fromEntries(Object.entries(obj).sort((a, b) => {
		// other is always last
		if (a[0] === "other") {
			return 1;
		}
		if (b[0] === "other") {
			return -1;
		}

		let count_a = a[1].palette_count ?? hues[a[0]].palette_count;
		let count_b = b[1].palette_count ?? hues[b[0]].palette_count;

		if (count_a === count_b) {
			let type_a = a[1].type ?? hues[a[0]].type;
			let type_b = b[1].type ?? hues[b[0]].type;

			if (type_a === type_b) {
				return 0;
			}

			// Hues before neutrals
			return type_a === "hue" ? -1 : 1;
		}

		return count_b - count_a;
	}));
}

// Sort by descending number of palettes
hues = sort_hues(hues);

// Count hues and neutrals per palette
for (let id in palettes) {
	let palette = palettes[id];

	for (let hue in palette.colors) {
		if (hue === "other") {
			continue;
		}

		palette.count[hues[hue].type]++;
	}

	// Sort hues by descending popularity
	palette.colors = sort_hues(palette.colors);
}

fs.writeFileSync("data/palettes.json", JSON.stringify(palettes, null, "\t"));
fs.writeFileSync("data/hues.json", JSON.stringify(hues, null, "\t"));

export {hues};
export default palettes;