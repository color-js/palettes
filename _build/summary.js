import * as fs from "fs";
import Color from "colorjs.io";
import * as filters from "./filters.js";

function read_json (file) {
	let contents = fs.readFileSync(file, "utf-8");
	return JSON.parse(contents);
}

let palettes = read_json("data/palette_metadata.json").filter(p => p.id);

// Add palette.colors to each palette
for (let palette of palettes) {
	// Import colors
	let colors = read_json(`data/${palette.id}.json`);
	let ret = {};
	let other = {};

	for (let hue in colors) {
		let value = colors[hue];
		let subColors = value && typeof value === "object" ? Object.values(value) : [value];

		if (subColors.length === 1) {
			// Single color, add to other
			other[hue] = subColors[0];
		}
		else {
			// Multiple colors, add to ret
			ret[hue] = Object.assign({}, value); // convert array to object
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

let hues = {};

for (let id in palettes) {
	let palette = palettes[id];

	if (!palette.colors) {
		continue;
	}

	for (let hue in palette.colors) {
		if (hue === "other") {
			continue;
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

		let hueColors = palette.colors[hue];
		let colors = Object.values(hueColors).map(str => new Color(str).to("oklch"));
		let hueValues = colors.map(c => c.get("h")).filter(h => Number.isFinite(h)).map(h => h + 360);
		hues[hue].hue.push(...hueValues);
		hues[hue].chroma.push(...colors.map(c => c.get("c")).filter(c => Number.isFinite(c)));
		hues[hue].palettes[palette.id] = hueColors;
	}
}

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

// Sort by descending number of palettes
hues = Object.fromEntries(Object.entries(hues).sort((a, b) => {
	let count_a = a[1].palette_count;
	let count_b = b[1].palette_count;

	if (count_a === count_b) {
		if (a[1].type === b[1].type) {
			return 0;
		}

		// Hues before neutrals
		return a[1].type === "hue" ? -1 : 1;
	}

	return count_b - count_a;
}));

fs.writeFileSync("data/palettes.json", JSON.stringify(palettes, null, "\t"));
fs.writeFileSync("data/hues.json", JSON.stringify(hues, null, "\t"));

export {hues};
export default palettes;