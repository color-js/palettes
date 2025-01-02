import Color from "https://colorjs.io/color.js";

import "https://elements.colorjs.io/src/color-scale/color-scale.js";
import "https://elements.colorjs.io/src/color-chart/color-chart.js";
// import "../node_modules/color-elements/src/color-scale/color-scale.js";
// import "../node_modules/color-elements/src/color-chart/color-chart.js";

let params = new URL(location.href).searchParams;

let charts_h2 = document.querySelector("h2#charts");
let scales_h2 = document.querySelector("h2:is(#tints, #palettes):has(+ table color-scale)");

if (charts_h2 || scales_h2) {
	const defaultSpace = "oklch";
	let spaceId = params.get("space") ?? defaultSpace;
	let spaces = {polar: {}, rectangular: {}};
	for (let id in Color.spaces) {
		let space = Color.spaces[id];

		if (space.id !== id) {
			continue;
		}
		let isPolar = space.coords.h?.type === "angle";
		spaces[isPolar ? "polar" : "rectangular"][id] = space;
	}

	let select = document.createElement("select");
	select.innerHTML = Object.entries(spaces).map(([type, spaces]) => `
		<optgroup label="${ type }">
			${ Object.entries(spaces).map(([id, space]) => `<option value="${ id }">${ space.name }</option>`).join("\n") }
		</optgroup>
	`).join("\n");
	select.value = spaceId;

	let select2;

	if (charts_h2) {
		// Filter color spaces by polar
		charts_h2.prepend(select, " ");
		let charts = charts_h2.parentElement.querySelectorAll("color-chart");

		select.onchange = evt => {
			spaceId = select.value;
			params.set("space", spaceId);
			console.log(params.toString());
			history.pushState(null, "", `?${ params }${ location.hash }`);
			let selectedSpace = Color.Space.all.find((space) => space.id === spaceId);
			let coords = Object.entries(selectedSpace.coords);
			let info = coords.map(([id, meta]) => `${ (meta.name ?? id)[0] }: ${ spaceId }.${ id }`).join(", ");

			for (let i = 0; i < 3; i++) {
				charts[i].y = spaceId + "." + coords[i][0];
				charts[i].info = info;
			}

			if (select2 && select2.value !== spaceId) {
				select2.value = spaceId;
				select2.dispatchEvent(new Event("change"));
			}
		}
	}

	if (scales_h2) {
		select2 = charts_h2 ? select.cloneNode(true) : select;
		select2.value = spaceId;
		scales_h2.prepend(select2, " ");
		let scales = scales_h2.nextElementSibling.querySelectorAll("color-scale");

		select2.onchange = evt => {
			spaceId = select2.value;
			let selectedSpace = Color.Space.all.find((space) => space.id === spaceId);
			let coords = Object.entries(selectedSpace.coords);
			let info = coords.map(([id, meta]) => `${ (meta.name ?? id)[0] }: ${ spaceId }.${ id }`).join(", ");

			for (let scale of scales) {
				scale.info = info;
			}

			if (select && select.value !== spaceId) {
				select.value = spaceId;
				select.dispatchEvent(new Event("change"));
			}
		}
	}

	// Trigger change events to update the charts and scales so they reflect the specified color space
	select?.dispatchEvent(new Event("change"));
	select2?.dispatchEvent(new Event("change"));
}
