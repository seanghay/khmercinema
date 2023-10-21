#!/usr/bin/env node
import { confirm, select, spinner, isCancel } from '@clack/prompts';
import { format } from 'date-fns';
import { open } from 'openurl';
import { locationList, movieList } from '../src/request.js';

const theaterId = await select({
	message: 'Pick a movie theater',
	options: [
		{ value: 'majorcineplex', label: 'Major Cineplex' },
		{ value: 'legendcinema', label: 'Legend Cinema' },
	],
});

if (isCancel(theaterId)) {
	process.exit(0)
}

const s = spinner();
s.start("Downloading movies list")
const list = await movieList(theaterId);
s.stop("Now Showing!");

let exitPickMovie = false;
let movie = null;

while (!exitPickMovie) {

	const movieId = await select({
		message: "Choose your movie",
		options: list,
		initialValue: movie ? list.indexOf(movie) : null
	});

	if (isCancel(movieId)) {
		process.exit(0)
	}

	movie = list[movieId]
	if (movie.trailer) {

		const showTrailer = await confirm({
			message: "Do you want to open the movie trailer?",
			initialValue: false,
		});

		if (isCancel(showTrailer)) {
			process.exit(0)
		}

		exitPickMovie = !showTrailer
		if (showTrailer) {
			open(movie.trailer)
		}
	} else {
		exitPickMovie = true
	}
}

const date = format(new Date(), 'yyyy-MM-dd');
s.start("Download locations list for " + date);

const locations = await locationList(theaterId, movie.uuid, date);
s.stop("Locations for " + date);

const locationId = await select({
	message: "Locations",
	options: locations,
})

if (isCancel(locationId)) {
	process.exit(0)
}


const tt = locations[locationId].times()
await select({
	message: "Showtimes",
	options: tt,
});


const viewWeb = await confirm({
	message: "View on the Web",
	initialValue: true,
})

if (isCancel(viewWeb)) {
	process.exit(0);
}

if (viewWeb) {

	if (theaterId === "legendcinema") {
		const url = 'https://www.legend.com.kh/movies/' + movie.uuid;
		open(url)
	}

	if (theaterId === 'majorcineplex') {
		const url = "https://www.majorcineplex.com.kh/movies/" + movie.uuid
		open(url)
	}
}
