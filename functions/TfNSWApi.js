const fetch = require('node-fetch');

class tfnswClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async makeAPIRequestAsync(method) {
        const requestUrl = `https://api.transport.nsw.gov.au${method}`;
        console.log(requestUrl)
        const response = await fetch(requestUrl, {headers: {'Authorization': `apikey ${this.apiKey}`}});

        if (response.status !== 200 && response.status !== 400 && response.status !== 403)
            throw new Error(`Response returned code ${response.status}. Check request method or internet connection`);

        const json = await response.json();

        if (response.status == 403)
            throw new Error(`Authentication error: "${json.message}"`);

        if (response.status == 400)
            throw new Error(`Invalid request: "${json.message}"`);

        return json;
    }

    async searchForStop(search_term) {
        const method = `/v1/tp/stop_finder?outputFormat=rapidJSON&type_sf=stop&name_sf=${encodeURIComponent(search_term)}&coordOutputFormat=EPSG%3A4326&TfNSWSF=true&version=10.2.1.42`;

        const searchResponse = await this.makeAPIRequestAsync(method)
        return searchResponse
    }
}

module.exports = tfnswClient;