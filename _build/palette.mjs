import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import JSON5 from "json5";

function process_palette (file, outputFile, {regex, parse}) {
	if (!file) {
		throw new Error("No file specified");
	}

	if (!outputFile) {
		throw new Error("No output file specified for processing", file);
	}

	let contents = fs.readFileSync(file, "utf-8");

	if (!contents) {
		throw new Error("Could not read file", file);
	}

	let ret, colors;

	if (parse) {
		ret = parse(contents);
	}
	else {
		let matches = contents.matchAll(regex);
		matches = [...matches];

		if (matches.length === 0) {
			throw new Error("Cound not extract colors from ", file);
		}

		ret = {};

		for (let match of matches) {
			let {hue, level, color} = match.groups;
			ret[hue] ??= {};
			ret[hue][level] = color;
		}

		colors = matches.length;
	}

	write_palette (outputFile, ret, colors);
	return ret;
}

function write_palette (outputFile, ret, colors) {
	fs.writeFileSync(outputFile, JSON.stringify(ret, null, "\t"));
	console.info(`Wrote ${ colors !== undefined? `${colors} colors and ` : ""}${ Object.keys(ret).length } groups to ${outputFile}`);
}

export function process_css_palette (file, outputFile) {
	let regex = /^\s*--color-(?<hue>[a-z]+)-(?<level>[0-9]+):\s*(?<color>[^;]+);$/gm;
	return process_palette(file, outputFile, {regex});
}

export function process_scss_palette (file, outputFile) {
	let regex = /^\s*\$(?<hue>[a-z]+)-(?<level>[0-9]+):\s*(?<color>[^;]+);$/gm;
	return process_palette(file, outputFile, {regex});
}

export function process_json_palette (file, outputFile, o = {}) {
	let {path: colorsPath} = o;
	let JSON = file.endsWith(".json5") ? JSON5 : globalThis.JSON;

	return process_palette(file, outputFile, {
		parse (contents) {
			let json = JSON.parse(contents);
			let colors = json;
			if (colorsPath) {
				colors = colorsPath.reduce((obj, key) => obj[key], colors);
			}

			return process_color_tokens(colors, o);
		}
	});
}

function process_color_tokens (value, o, key, ret = {}) {
	if (!value) {
		return;
	}

	if (key !== undefined) {
		if (typeof value === "string") {
			ret[key] = value;
			return;
		}

		if (value.$schema?.startsWith("https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color")) {
			// Flat schema, key encodes both hue and level
			let hue = key, level;

			if (/-[0-9]+$/m.test(key)) {
				// Key ends with level
				let parts = key.split("-");
				level = parts.pop();
				hue = parts.join("-");
			}

			ret[hue] ??= {};

			let o, k;

			if (level === undefined) {
				o = ret;
				k = hue;
			}
			else {
				o = ret[hue];
				k = level;
			}

			// if (key === "gray-50") {
			// 	console.log(hue, level);
			// }

			if (value.value) {
				o[k] = value.value;
			}
			else if (value.sets) {
				o[k] = value.sets[o.set ?? "light"].value;
			}

			return;
		}
		else if (value?.$value) {
			// It's a value
			if (value.$type === "color") {
				ret[key] = value.$value;
			}
			return;
		}
	}

	// If we're here, it's a group
	let obj;
	if (key !== undefined) {
		obj = ret[key] ??= {};
	}
	else {
		obj = ret;
	}

	for (let key in value) {
		process_color_tokens(value[key], o, key, obj);
	}

	return ret;
}

async function process_js_palette (file, outputFile, { exportName } = {}) {
	// Get absolute path for file (which is relative to CWD)
	let filePath = path.resolve(file);
	// Convert to URL for import()
	let importURL = pathToFileURL(filePath);
	let module = await import(importURL);
	let ret = {};
	let colors;

	if (exportName) {
		// Specific export contains all colors
		ret = module[exportName];
	}
	else {
		// Loop through all non-default exports
		colors = 0;
		for (let Hue in module) {
			if (Hue === "default") {
				continue;
			}

			let hue = Hue.toLowerCase();
			ret[hue] = Object.fromEntries(Object.entries(module[Hue]).map(([key, value]) => {
				key = key.replace(RegExp(`^--(${ hue }-)?`, "m"), "");
				colors++;
				return [key, value];
			}));
		}
	}

	write_palette(outputFile, ret, colors);
}

// process_css_palette("data/raw/tailwind.css", "data/palettes/tailwind.json");
// process_scss_palette("data/raw/material.scss", "data/palettes/material.json");
// process_json_palette("data/raw/primer-light.json5", "data/palettes/primer.json", {path: ["base", "color"]});
// process_js_palette("data/raw/openprops.js", "data/palettes/openprops.json");
// process_js_palette("data/raw/carbon.js", "data/palettes/carbon.json", {exportName: "colors"});
// process_json_palette("data/raw/spectrum.json", "data/palettes/spectrum.json");