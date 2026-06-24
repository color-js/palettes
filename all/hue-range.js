// Filter all palette scales by the hue of their key color (max-chroma color),
// and optionally by a region of the chart's visible axes.
// Key hues are precomputed at build time and stored in `data-key-hue` (degrees).

let params = new URL(location.href).searchParams;

let hCenter = document.getElementById("h-center"); // <channel-slider>
let hExtent = document.getElementById("h-extent");
let matchCount = document.getElementById("match-count");

let axisForm = document.getElementById("axis-filter");
let axisInputs = {
	xMin: document.getElementById("x-min"),
	xMax: document.getElementById("x-max"),
	yMin: document.getElementById("y-min"),
	yMax: document.getElementById("y-max"),
};

let chart = document.querySelector("color-chart");
let pickers = [...document.querySelectorAll("space-picker")];
let allScales = [...document.querySelectorAll("color-scale")];
let chartScales = [...chart.querySelectorAll("color-scale")];
let rows = [...document.querySelectorAll(".key-scale-row")];

// Each table row paired with its (matching) chart scale, so we can reuse the
// chart scale's parsed colors when testing the axis region.
let rowScales = rows.map(row => ({ row, scale: row.querySelector("color-scale") }));

function debounce (fn, ms = 120) {
	let timer;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
}

// --- Hue filter -----------------------------------------------------------

// Shortest angular distance between two hues, in [0, 180]
function hueDistance (a, b) {
	let d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
}

function hueMatches (keyHue, center, extent) {
	if (Number.isNaN(keyHue)) {
		return false;
	}

	return hueDistance(keyHue, center) <= extent;
}

// --- Axis-region filter ---------------------------------------------------

function parseLimit (input, fallback) {
	let value = input.value.trim();
	return value === "" ? fallback : Number(value);
}

// Channel id currently plotted on an axis, e.g. "oklch-p3.l" → "l" (or null)
function axisChannel (coordRef) {
	return coordRef ? String(coordRef).split(".").pop() : null;
}

// Color space the chart's axes are currently expressed in, e.g. "oklch-p3"
function axisSpace () {
	return String(chart.y).split(".").slice(0, -1).join(".") || "oklch";
}

// True if at least one color in the scale falls inside the [min, max] window
// on both visible axes. Empty (NaN) coordinates count as out of range.
function scaleInRegion (scale, region) {
	let colors = scale.computedColors;
	if (!colors) {
		return true; // not parsed yet — don't hide
	}

	for (let { color } of colors) {
		let c = color.to(region.space);

		let yValue = c.get(region.yChannel);
		if (!(yValue >= region.yMin && yValue <= region.yMax)) {
			continue;
		}

		if (region.xChannel) {
			let xValue = c.get(region.xChannel);
			if (!(xValue >= region.xMin && xValue <= region.xMax)) {
				continue;
			}
		}

		return true;
	}

	return false;
}

function channelRange (axis) {
	let resolved = axis === "x" ? chart.xResolved : chart.yResolved;
	return resolved?.range ?? resolved?.refRange ?? null;
}

// Treat a bound that matches (or loosens) the channel's full range as "no
// limit", so the pre-filled full-range values don't filter or pin the axes.
function effectiveMin (input, rangeMin) {
	let value = parseLimit(input, -Infinity);
	return rangeMin != null && value <= rangeMin ? -Infinity : value;
}

function effectiveMax (input, rangeMax) {
	let value = parseLimit(input, Infinity);
	return rangeMax != null && value >= rangeMax ? Infinity : value;
}

function currentRegion () {
	let xRange = channelRange("x");
	let yRange = channelRange("y");
	let xMin = effectiveMin(axisInputs.xMin, xRange?.[0]);
	let xMax = effectiveMax(axisInputs.xMax, xRange?.[1]);
	let yMin = effectiveMin(axisInputs.yMin, yRange?.[0]);
	let yMax = effectiveMax(axisInputs.yMax, yRange?.[1]);

	return {
		space: axisSpace(),
		xChannel: axisChannel(chart.x),
		yChannel: axisChannel(chart.y),
		xMin, xMax, yMin, yMax,
		// Active only if the user narrowed at least one bound below its range
		active: xMin > -Infinity || xMax < Infinity || yMin > -Infinity || yMax < Infinity,
	};
}

// --- Apply everything -----------------------------------------------------

function applyFilters () {
	let center = Number(hCenter.value) || 0;
	let extent = hExtent.value.trim() === "" ? 180 : Number(hExtent.value);

	// Constrain the chart's visible axes (the chart clips out-of-range points).
	let region = currentRegion();
	chart.xMinAsNumber = region.xMin === -Infinity ? NaN : region.xMin;
	chart.xMaxAsNumber = region.xMax === Infinity ? NaN : region.xMax;
	chart.yMinAsNumber = region.yMin === -Infinity ? NaN : region.yMin;
	chart.yMaxAsNumber = region.yMax === Infinity ? NaN : region.yMax;

	let testRegion = region.active;

	// Chart scales: hidden only by the hue filter (axis clipping is automatic).
	for (let scale of chartScales) {
		let hidden = !hueMatches(Number(scale.dataset.keyHue), center, extent);
		scale.classList.toggle("filtered-out", hidden);
	}

	// Table rows: hidden by the hue filter or when entirely outside the region.
	let matches = 0;
	for (let { row, scale } of rowScales) {
		let hidden = !hueMatches(Number(row.dataset.keyHue), center, extent);

		if (!hidden && testRegion) {
			hidden = !scaleInRegion(scale, region);
		}

		row.classList.toggle("filtered-out", hidden);
		if (!hidden) {
			matches++;
		}
	}

	matchCount.textContent = `${matches} of ${rows.length} scales`;

	params.set("hc", Math.round(center));
	params.set("he", extent);
	history.replaceState(null, "", `?${params}${location.hash}`);
}

let applyFiltersDebounced = debounce(applyFilters);

// --- Color space ----------------------------------------------------------
// Drives the chart axes and the labels on every scale; both pickers stay in sync.

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

	// Axis-region limits are space/channel specific; clear them on space change.
	axisForm.reset();
	updateAxisControls();

	params.set("space", spaceId);
	history.replaceState(null, "", `?${params}${location.hash}`);

	applyFilters();
}

// A "nice" step (1/2/5 × 10ⁿ) giving roughly 100 increments across the range
function niceStep (min, max) {
	let raw = (max - min) / 100;
	if (!(raw > 0)) {
		return "any";
	}

	let mag = 10 ** Math.floor(Math.log10(raw));
	let norm = raw / mag;
	let nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
	return +(nice * mag).toPrecision(4);
}

// Label each axis-region control and give its inputs the real channel range
function updateAxisControls () {
	for (let axis of ["x", "y"]) {
		let resolved = axis === "x" ? chart.xResolved : chart.yResolved;
		let range = resolved?.range ?? resolved?.refRange;

		let nameEl = axisForm.querySelector(`.axis-name[data-axis="${axis}"]`);
		if (nameEl) {
			nameEl.textContent = resolved?.name ?? axis.toUpperCase();
		}

		let minInput = axisInputs[axis === "x" ? "xMin" : "yMin"];
		let maxInput = axisInputs[axis === "x" ? "xMax" : "yMax"];

		for (let [input, bound] of [[minInput, range?.[0]], [maxInput, range?.[1]]]) {
			if (range) {
				input.min = range[0];
				input.max = range[1];
				input.step = niceStep(range[0], range[1]);
				// Pre-fill with the range bound so it's visible and tweakable
				input.value = bound;
			}
			else {
				input.removeAttribute("min");
				input.removeAttribute("max");
				input.step = "any";
				input.value = "";
			}
		}

		minInput.placeholder = range ? `${range[0]}` : "min";
		maxInput.placeholder = range ? `${range[1]}` : "max";
	}

	lastAxes = { x: chart.x, y: chart.y };
}

// Re-sync the region controls when the chart's own picker changes an axis.
// (The chart's y/x props don't reflect to attributes or emit a dedicated
// event, so we watch its bubbling input/spacechange and diff the axes.)
let lastAxes = { x: null, y: null };
function onChartAxisChange () {
	if (chart.x === lastAxes.x && chart.y === lastAxes.y) {
		return;
	}

	updateAxisControls();
	applyFilters();
}

// --- Init -----------------------------------------------------------------

// Restore hue values from URL
let centerParam = params.get("hc");
if (centerParam !== null && centerParam !== "") {
	hCenter.setAttribute("value", centerParam);
}
let extentParam = params.get("he");
if (extentParam !== null && extentParam !== "") {
	hExtent.value = extentParam;
}

let spaceId = params.get("space");
for (let picker of pickers) {
	if (spaceId) {
		picker.value = spaceId;
	}
	picker.addEventListener("spacechange", () => updateSpace(picker));
}

hCenter.addEventListener("input", applyFiltersDebounced);
hExtent.addEventListener("input", applyFiltersDebounced);
axisForm.addEventListener("input", applyFiltersDebounced);
chart.addEventListener("input", onChartAxisChange);
chart.addEventListener("spacechange", onChartAxisChange);
axisForm.addEventListener("reset", () =>
	requestAnimationFrame(() => {
		updateAxisControls();
		applyFilters();
	}),
);

await Promise.all(
	["space-picker", "channel-slider", "color-chart", "color-scale"].map(tag =>
		customElements.whenDefined(tag),
	),
);

if (pickers[0]) {
	updateSpace(pickers[0]);
}

updateAxisLabels();
applyFilters();
