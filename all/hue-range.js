// Filter all palette scales by the hue of their key color (max-chroma color).
// Key hues are precomputed at build time and stored in `data-key-hue` (degrees).

let params = new URL(location.href).searchParams;

let form = document.getElementById("hue-filter");
let hMinInput = document.getElementById("h-min");
let hMaxInput = document.getElementById("h-max");
let matchCount = document.getElementById("match-count");

// Every element that represents a scale (chart points + table rows)
let scales = [...document.querySelectorAll("[data-key-hue]")];
let rowCount = document.querySelectorAll(".key-scale-row").length;

function inRange (hue, min, max) {
	if (Number.isNaN(hue)) {
		return false;
	}

	if (min <= max) {
		return hue >= min && hue <= max;
	}

	// Range wraps around 0° (e.g. 350 → 20)
	return hue >= min || hue <= max;
}

function filter () {
	let min = Number(hMinInput.value);
	let max = Number(hMaxInput.value);

	if (Number.isNaN(min)) {
		min = 0;
	}
	if (Number.isNaN(max)) {
		max = 360;
	}

	let matches = 0;

	for (let scale of scales) {
		let hue = Number(scale.dataset.keyHue);
		let visible = inRange(hue, min, max);
		scale.classList.toggle("filtered-out", !visible);

		if (visible && scale.classList.contains("key-scale-row")) {
			matches++;
		}
	}

	matchCount.textContent = `${matches} of ${rowCount} scales`;

	params.set("hmin", min);
	params.set("hmax", max);
	history.replaceState(null, "", `?${params}${location.hash}`);
}

// Restore range from URL, if present
for (let [param, input] of [["hmin", hMinInput], ["hmax", hMaxInput]]) {
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
