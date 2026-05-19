import { SpacePicker, ColorScale, ColorChart } from "color-elements";

let params = new URL(location.href).searchParams;

let chartsPicker = document.querySelector("h2#charts space-picker");
let scalesPicker = document.querySelector(
	"h2:is(#tints, #palettes) space-picker",
);
let pickers = [chartsPicker, scalesPicker].filter(Boolean);

let charts =
	chartsPicker?.parentElement.parentElement.querySelectorAll("color-chart");
let scales =
	scalesPicker?.parentElement.nextElementSibling.querySelectorAll(
		"color-scale",
	);

function groupBy (space) {
	let isPolar = space.coords.h?.type === "angle";
	return isPolar ? "Polar" : "Rectangular";
}

function update (source) {
	let spaceId = source.value;
	let coords = Object.entries(source.selectedSpace.coords);
	let hasL = coords.some(([id]) => id === "l");
	let info = coords
		.map(([id, meta]) => `${(meta.name ?? id)[0]}: ${spaceId}.${id}`)
		.join(", ");

	params.set("space", spaceId);
	history.pushState(null, "", `?${params}${location.hash}`);

	if (charts) {
		for (let i = 0; i < 3; i++) {
			charts[i].y = `${spaceId}.${coords[i][0]}`;
			charts[i].x = hasL && coords[i][0] !== "l" ? `${spaceId}.l` : null;
			charts[i].info = info;
		}
	}

	for (let scale of scales ?? []) {
		scale.info = info;
	}

	for (let picker of pickers) {
		if (picker !== source && picker.value !== spaceId) {
			picker.value = spaceId;
		}
	}
}

let spaceId = params.get("space");

for (let picker of pickers) {
	picker.groupBy = groupBy;
	if (spaceId) {
		picker.value = spaceId;
	}
	picker.addEventListener("spacechange", () => update(picker));
}

await Promise.all(
	["space-picker", "color-chart", "color-scale"].map((tag) =>
		customElements.whenDefined(tag),
	),
);

pickers[0] && update(pickers[0]);
