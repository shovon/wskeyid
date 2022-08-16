import * as http from "node:http";

http.createServer((req, res) => {
	if (!req.url) {
		res.statusCode = 500;
		res.write(
			"This is our problem. We failed to process the URL. Investigating"
		);
		return;
	}

	const url = new URL(`somehwere://somewhere${req.url}`);
});
