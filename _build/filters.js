import * as path from "path";

export function relative (page) {
	let pagePath = page.url.replace(/[^/]+$/, "");
	let ret = path.relative(pagePath, "/");

	return ret || ".";
}

export function unslugify (slug) {
	return slug.replace(/(^|-)([a-z])/g, ($0, $1, $2) => ($1 ? " " : "") + $2.toUpperCase());
}

export function number (value, options) {
	if (typeof value !== "number" && isNaN(value)) {
		return value;
	}

	return Number(value).toLocaleString("en", options);
}

export function serializeObject (obj) {
	return Object.entries(obj).map(([key, value]) => `${ key }: ${ value }`).join(", ");
}

export function objectValues (obj) {
	return Object.values(obj);
}

export function objectKeys (obj) {
	return Object.keys(obj);
}

export function min (arr) {
	return Math.min(...arr);
}

export function max (arr) {
	return Math.max(...arr);
}

export function mean (arr) {
	return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function median (arr) {
	arr = arr.slice().sort((a, b) => a - b);

	if (arr.length % 2 === 0) {
		return (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
	}
	else {
		return arr[Math.floor(arr.length / 2)];
	}
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