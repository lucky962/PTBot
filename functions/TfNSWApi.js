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

    async getDepartures(stop_id, route_type) {
        const method = `/v1/tp/departure_mon?outputFormat=rapidJSON&coordOutputFormat=EPSG%3A4326&mode=direct&type_dm=stop&name_dm=${stop_id}&departureMonitorMacro=true&excludedMeans=checkbox${(route_type == 1)?'':'&exclMOT_1=1'}${(route_type == 2)?'':'&exclMOT_2=1'}${(route_type == 4)?'':'&exclMOT_4=1'}${(route_type == 5)?'':'&exclMOT_5=1'}${(route_type == 7)?'':'&exclMOT_7=1'}${(route_type == 9)?'':'&exclMOT_9=1'}&exclMOT_11=1&TfNSWDM=true&version=10.2.1.42`

        const searchResponse = await this.makeAPIRequestAsync(method)
        return searchResponse
    }
}

module.exports = tfnswClient;