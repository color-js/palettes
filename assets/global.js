import Color from "https://colorjs.io/color.js";

import "https://elements.colorjs.io/src/color-scale/color-scale.js";
import "https://elements.colorjs.io/src/color-chart/color-chart.js";
// import "../node_modules/color-elements/src/color-scale/color-scale.js";
// import "../node_modules/color-elements/src/color-chart/color-chart.js";

let charts_h2 = document.querySelector("h2#charts");

if (charts_h2) {
	// Filter color spaces by polar
	let polarSpaces = Object.values(Color.spaces).filter((value) => value.coords.h && Object.values(value.coords).length === 3);
	let select = document.createElement("select");
	select.innerHTML = polarSpaces.map((space) => `<option value="${ space.id }">${ space.name }</option>`).join("");
	select.value = "oklch";
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
