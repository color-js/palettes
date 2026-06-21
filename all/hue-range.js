// Filter all palette scales by the hue of their key color (max-chroma color).
// Key hues are precomputed at build time and stored in `data-key-hue` (degrees).

let params = new URL(location.href).searchParams;

let form = document.getElementById("hue-filter");
let hCenterInput = document.getElementById("h-center");
let hExtentInput = document.getElementById("h-extent");
let matchCount = document.getElementById("match-count");

// Every element that represents a scale (chart points + table rows)
let scales = [...document.querySelectorAll("[data-key-hue]")];
let rowCount = document.querySelectorAll(".key-scale-row").length;

// Shortest angular distance between two hues, in [0, 180]
function hueDistance (a, b) {
	let d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
}

function inRange (hue, center, extent) {
	if (Number.isNaN(hue)) {
		return false;
	}

	return hueDistance(hue, center) <= extent;
}

function filter () {
	let center = Number(hCenterInput.value);
	let extent = Number(hExtentInput.value);

	if (Number.isNaN(center)) {
		center = 0;
	}
	if (Number.isNaN(extent)) {
		extent = 180;
	}

	let matches = 0;

	for (let scale of scales) {
		let hue = Number(scale.dataset.keyHue);
		let visible = inRange(hue, center, extent);
		scale.classList.toggle("filtered-out", !visible);

		if (visible && scale.classList.contains("key-scale-row")) {
			matches++;
		}
	}

	matchCount.textContent = `${matches} of ${rowCount} scales`;

	params.set("hcenter", center);
	params.set("hextent", extent);
	history.replaceState(null, "", `?${params}${location.hash}`);
}

// Restore values from URL, if present
for (let [param, input] of [["hcenter", hCenterInput], ["hextent", hExtentInput]]) {
	let value = params.get(param);
	if (value !== null && value !== "") {
		input.value = value;
	}
}

form.addEventListener("input", filter);

// Color space: drives the chart axes and the labels on every scale (chart + table).
// Both section pickers (chart and scales) stay in sync, like the regular pages.
let pickers = [...document.querySelectorAll("space-picker")];
let chart = document.querySelector("color-chart");
let allScales = [...document.querySelectorAll("color-scale")];

function updateSpace (source) {
	let spaceId = source.value;
	let coords = Object.entries(source.selectedSpace.coords);
	let hasL = coords.some(([id]) => id === "l");
	let info = coords
		.map(([id, meta]) => `${(meta.name ?? id)[0]}: ${spaceId}.${id}`)
		.join(", ");

	// Plot the second channel (e.g. chroma) against lightness when available,
	// otherwise the first two channels against each other.
	let [first, second] = coords;
	chart.y = `${spaceId}.${second[0]}`;
	chart.x = hasL && second[0] !== "l" ? `${spaceId}.l` : `${spaceId}.${first[0]}`;
	chart.info = info;

	for (let colorScale of allScales) {
		colorScale.info = info;
	}

	for (let picker of pickers) {
		if (picker !== source && picker.value !== spaceId) {
			picker.value = spaceId;
		}
	}

	params.set("space", spaceId);
	history.replaceState(null, "", `?${params}${location.hash}`);
}

let spaceId = params.get("space");

for (let picker of pickers) {
	if (spaceId) {
		picker.value = spaceId;
	}

	picker.addEventListener("spacechange", () => updateSpace(picker));
}

await Promise.all(
	["space-picker", "color-chart", "color-scale"].map(tag =>
		customElements.whenDefined(tag),
	),
);

if (pickers[0]) {
	updateSpace(pickers[0]);
}

filter();
