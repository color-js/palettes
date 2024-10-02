import Color from "https://colorjs.io/color.js";

import "https://elements.colorjs.io/src/color-scale/color-scale.js";
import "https://elements.colorjs.io/src/color-chart/color-chart.js";
// import "../node_modules/color-elements/src/color-scale/color-scale.js";
// import "../node_modules/color-elements/src/color-chart/color-chart.js";

let charts_h2 = document.querySelector("h2#charts");
let scales_h2 = document.querySelector("h2:is(#tints, #palettes):has(+ table color-scale)");

if (charts_h2 || scales_h2) {
	let polarSpaces = Object.values(Color.spaces).filter((value) => value.coords.h && Object.values(value.coords).length === 3);
	let select = document.createElement("select");
	select.innerHTML = polarSpaces.map((space) => `<option value="${ space.id }">${ space.name }</option>`).join("");
	select.value = "oklch";

	if (charts_h2) {
		// Filter color spaces by polar
		charts_h2.prepend(select, " ");

		let charts = charts_h2.parentElement.querySelectorAll("color-chart");

		select.onchange = evt => {
			let selectedId = select.value;
			let selectedSpace = polarSpaces.find((space) => space.id === selectedId);
			let coords = Object.entries(selectedSpace.coords);

			for (let i = 0; i < 3; i++) {
				charts[i].y = selectedId + "." + coords[i][0];
			}
		}
	}

	if (scales_h2) {
		let select2 = select.cloneNode(true);
		scales_h2.prepend(select2, " ");
		let scales = scales_h2.nextElementSibling.querySelectorAll("color-scale");

		select2.onchange = evt => {
			let selectedId = select2.value;
			let selectedSpace = polarSpaces.find((space) => space.id === selectedId);
			let coords = Object.entries(selectedSpace.coords);
			let info = coords.map(([id, meta]) => `${ (meta.name ?? id)[0] }: ${ selectedId }.${ id }`).join(", ");

			for (let scale of scales) {
				scale.info = info;
			}
		}
	}
}


