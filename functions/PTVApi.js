const crypto = require('crypto');
const fetch = require('node-fetch');

class ptvClient {
    constructor(devId, apiKey) {
        this.devId = devId;
        this.apiKey = apiKey;
    }

    async makeAPIRequestAsync(method) {
        const separator = (method.includes('?')) ? '&' : '?';
        const query = `${method}${separator}devid=${this.devId}`;
        const signature = crypto.createHmac('sha1', this.apiKey).update(query).digest('hex');
        const requestUrl = `https://timetableapi.ptv.vic.gov.au${query}&signature=${signature}`;
        console.log(requestUrl)
        const response = await fetch(requestUrl);

        if (response.status !== 200 && response.status !== 400 && response.status !== 403)
            throw new Error(`Response returned code ${response.status}. Check request method or internet connection`);

        const json = await response.json();

        if (response.status == 403)
            throw new Error(`Authentication error: "${json.message}"`);

        if (response.status == 400)
            throw new Error(`Invalid request: "${json.message}"`);

        return json;
    }

    async searchForStop(search_term, route_types) {
        const route_types_string = route_types.map(rt => `route_types=${rt}`).join('&')
        const method = `/v3/search/${encodeURIComponent(search_term)}?${route_types_string}&include_addresses=false&include_outlets=false&match_stop_by_suburb=false&match_route_by_suburb=false`;

        const searchResponse = await this.makeAPIRequestAsync(method)
        return searchResponse
    }

    async getDepartures(stop_id, route_type) {
        const method = `/v3/departures/route_type/${route_type}/stop/${stop_id}?max_results=3&expand=all`;

        const departureResults = await this.makeAPIRequestAsync(method)
        return departureResults
    }

    async getDisruptions() {
        const method = `/v3/disruptions?route_types=0`;

        const disruptionsResponse = await this.makeAPIRequestAsync(method)
        return disruptionsResponse
    }

    async getRoutes() {
        const method = `/v3/routes?route_types=0`;

        const routesResponse = await this.makeAPIRequestAsync(method)
        return routesResponse
    }
}

module.exports = ptvClient;