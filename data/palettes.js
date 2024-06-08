import { readFileSync } from "fs";

function read_json (file) {
	let contents = readFileSync(file, "utf-8");
	return JSON.parse(contents);
}

let Palettes = read_json("data/palette_metadata.json").filter(p => p.id);

for (let palette of Palettes) {
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
		ret.other = other;
	}

	palette.colors = ret;
}

Palettes = Object.fromEntries(Palettes.map(p => [p.id, p]));

export default Palettes;