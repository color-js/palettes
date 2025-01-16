import * as path from "path";
export * from "./filters/aggregates.js";

export function relative (page) {
	let pagePath = page.url.replace(/[^/]+$/, "");
	let ret = path.relative(pagePath, "/");

	return ret || ".";
}

export function unslugify (slug) {
	return slug.replace(/(^|-)([a-z])/g, ($0, $1, $2) => ($1 ? " " : "") + $2.toUpperCase());
}

/**
 * Convert any angle to the range [0, 360)
 * @param {number} angle
 * @returns {number}
 */
export function normalizeAngle (angle) {
	return (angle % 360 + 360) % 360;
}

export function number (value, options) {
	if (typeof value !== "number" && isNaN(value)) {
		return value;
	}

	if (options?.style === "angle") {
		value = normalizeAngle(value);
		delete options.style;
	}

	if (!options || Object.keys(options).length === 0) {
		options = { maximumSignificantDigits: 3 };
	}

	return Number(value).toLocaleString("en", options);
}

export function prependKeys (obj, prefix) {
	let ret = {};

	for (let [key, value] of Object.entries(obj)) {
		ret[prefix + key] = value;
	}

	return ret;
}

export function plotHue (huePalettes) {
	let ret = [];

	for (let paletteId in huePalettes) {
		let colors = huePalettes[paletteId];
		let step = 100 / (Object.values(colors).length - 1);

		let newColors = mapObject(colors, ([key, value], i) => [`${ paletteId } ${ key } / ${ i * step }`, value]);
		ret.push(newColors);
	}

	return ret;
}

export function mapObject (obj, fn) {
	return Object.fromEntries(Object.entries(obj).map(fn));
}

export function serializeObject (obj) {
	return Object.entries(obj).map(([key, value]) => `${ key }: ${ value }`).join(", ");
}

export function values (obj) {
	return Object.values(obj);
}

export function keys (obj) {
	return Object.keys(obj);
}

export function range (obj) {
	if (!obj || typeof obj !== "object") {
		return number(obj);
	}

	let ret = number(obj.min);

	if (obj.min == obj.max) {
		return ret;
	}

	return ret + " – " + number(obj.max);
}
