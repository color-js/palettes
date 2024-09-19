
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

export function stddev (arr) {
	let avg = mean(arr);
	let sum = arr.reduce((a, b) => a + (b - avg) ** 2, 0);

	return Math.sqrt(sum / arr.length);
}
