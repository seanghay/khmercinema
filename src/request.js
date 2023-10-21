import axios from 'axios';
import { Agent } from 'https';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { format } from 'date-fns';

function durationFormat({ hour, minute }) {
	return `${hour}h${minute}m`
}

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

const client = axios.create({
	httpsAgent: new Agent({
		rejectUnauthorized: false,
	})
})

export async function movieList(theaterId) {
	if (theaterId === "majorcineplex") {
		const { data } = await client.get("https://majorcineplex.com.kh/api/movie?category=now%20showing");
		return data.map((item, i) => {
			const date = timeAgo.format(new Date(item.releaseDate), 'mini')
			const tag = item.tag || "";
			return ({
				value: i,
				label: `[${date}] ${item.name}, ${tag}`,
				hint: durationFormat(item.duration),
				trailer: item.trailerVideo,
				uuid: item.id,
			})
		})
	}

	if (theaterId === 'legendcinema') {
		const url = `https://api.legend.com.kh/scheduled-films?limit=100&date=${new Date().toISOString()}&vistaCinemaId&sort=latest-released`
		const { data } = await client.get(url);
		return data.rows.map((item, i) => {
			const date = timeAgo.format(new Date(item.openingDate), 'mini')
			const tag = item.genreName || "";

			const hour = Math.floor(item.runTime / 60);
			const minute = item.runTime % 60;

			return {
				value: i,
				label: `[${date}] ${item.title}, ${tag}`,
				trailer: item.trailerUrl,
				uuid: item.vistaFilmId,
				hint: durationFormat({ hour, minute}),
			}
		});
	}
}

export async function locationList(theaterId, movieId, date) {

	if (theaterId === 'majorcineplex') {
		const { data } = await client.get(`https://majorcineplex.com.kh/api/show-movie?date=${date}&movie=${movieId}`)

		return data.map((item, id) => {
			return ({
				value: id,
				label: item.location,
				times() {
					const times = [];

					for (const t of item.theaters) {
						const category = t.movies[0].category;
						let mode = /(3D|2D)/.exec(category);

						if (mode) {
							mode = `, ${mode[1]}`
						} else {
							mode = ""
						}

						const sessions = t.movies[0].movies
							.filter(item => new Date() <= new Date(item.showTime))
							.map(item => `${format(new Date(item.showTime), 'h:mm aa')} ${timeAgo.format(new Date(item.showTime))}`);

						for (const session of sessions) {
							times.push(`[${t.name}${mode}] ${session}`)
						}
					}
					return times.map((item, id) => ({ value: id, label: item }));
				}
			})
		});
	}

	if (theaterId === 'legendcinema') {
		const { data } = await client.get(`https://api.legend.com.kh/scheduled-films/${movieId}/group-sessions?date=${date}T00:00:00.000Z&vistaCinemaId`)
		const filtered = data.filter(item => item.formats.length > 0)
		return filtered.map((item, id) => {
			return ({
				value: id,
				label: item.name,
				times() {
					const values = []
					for (const f of filtered) {
						for (const i of f.formats) {
							for (const g of i.groups) {
								for (const session of g.sessions) {
									const dd = new Date(session.startTime);
									if (dd < new Date()) {
										continue;
									}
									values.push(`[${i.shortName}] ${format(dd, 'h:mm aa')} ${timeAgo.format(dd)}`)
								}
							}
						}
					}
					return values.map((label, value) => ({ value, label }))
				}
			})
		});
	}
	// 
} 