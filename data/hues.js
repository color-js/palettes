import Palettes from "./palettes.js";
import Color from "colorjs.io";
import * as filters from "../_build/filters.js";

let hues = {};

for (let id in Palettes) {
	let palette = Palettes[id];

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
			values,
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
// console.log(hues);
export default hues;