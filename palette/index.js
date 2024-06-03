import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js'
// import "https://elements.colorjs.io/src/color-scale/color-scale.js";
import "../../elements/src/color-scale/color-scale.js";
let paletteMetadata = await fetch("../data/palettes.json").then(r => r.json());

globalThis.app = createApp({
	data () {
		let palettes = paletteMetadata.filter(p => p.id);
		return {
			palettes,
			colors: {},
			selectedPaletteId: palettes[0].id,
		};
	},

	computed: {
		paletteScales () {
			let colors = this.colors[this.selectedPaletteId];
			let ret = {};
			let other = {};

			for (let hue in colors) {
				let value = colors[hue];
				let subColors = value && typeof value === "object" ? Object.values(value) : [value];

				if (subColors.length === 1) {
					// Single color, add to other
					other[hue] = subColors[0];
				}
				else {
					// Multiple colors, add to ret
					ret[hue] = value;
				}
			}

			ret.other = other;

			return ret;
		},
	},

	watch: {
		selectedPaletteId: {
			handler (id) {
				if (!this.colors[id]) {
					fetch(`../data/${ this.selectedPaletteId }.json`).then(r => r.json()).then(colors => this.colors[id] = colors);
				}
			},
			immediate: true,
		},
	},

	compilerOptions: {
		isCustomElement: tag => tag === "color-swatch",
	},
}).mount(document.body);

