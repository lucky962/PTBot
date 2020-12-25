import datetime
import json
import grequests

import discord
from ptv.client import PTVClient

class PTVFormatter(PTVClient):
	def __init__(self, dev_id, api_key, not_secure = False):
		super().__init__(dev_id, api_key, not_secure=not_secure)

	def _splicegen(self, maxchars, stringlist):
		runningcount = 0
		tmpslice = []
		for item in stringlist:
			runningcount += len(item)
			if runningcount <= int(maxchars):
				tmpslice.append(item)
			else:
				tmpslice = [item]
				runningcount = len(item)
		yield(tmpslice)

	def _groupDisruptions(self, disruptions):
		dict1 = {"Part suspended" : [],
				"Major Delays" : [], 
				"Minor Delays" : [], 
				"Planned Works" : [], 
				"Planned Closure" : [], 
				"Service Information" : [],
				"Other" : []}
		for disruption in disruptions:
			if disruption['disruption_type'] in dict1:
				dict1[disruption['disruption_type']].append(f"[{disruption['title']}]({disruption['url']})")
			else:
				dict1["Other"].append(f"[{disruption['title']}]({disruption['url']})")
		return dict1

	def setDisruptionColour(self, disruptionsmsg, route_id, bot, disruptions):
		ServiceStatusColours = {
				"Good Service" : 0x97d700, 
				"Service Information" : 0xd3ecf4, 
				"Major Delays" : 0xef4135, 
				"Minor Delays" : 0xe87800, 
				"Planned Works" : 0xffd500, 
				"Planned Closure" : 0xffd500, 
				"Part suspended" : 0x1f1f1f,
				"Other" : 0x97d700}
		if disruptions["Part suspended"]:
			disruptionsmsg.colour = 0x1f1f1f
			return
		try:
			disruptionsmsg.colour = ServiceStatusColours[bot.routeservicestatus["routes"][int(route_id) - 1 if int(route_id) < 10 else int(route_id) - 2]["route_service_status"]["description"]]
		except KeyError:
			disruptionsmsg.colour = 0x97d700

	def disruptions_to_embed(self, disruptionsmsg, disruptions, route_id, bot):
		"""
		Changes Disruptions from PTV Api to an Embed object

		Parameters
		----------
		Disruptionsmsg : embedobject
			Embed object of the disruptions msg
		disruptions : dict
			dict of disruptions from PTV Api

		Returns
		-------
		Disruptionsmsg : embedobject
			Embed object of completed disruptions msg
		"""
		disruptions = self._groupDisruptions(disruptions)
		if bot.routeservicestatus["routes"][int(route_id) - 1 if int(route_id) < 10 else int(route_id) - 2]["route_service_status"]["description"] == "Good Service" and not disruptions["Part suspended"]:
			disruptionsmsg.add_field(name="Good Service", value='Trains are currently running on time to five minutes.')
		self.setDisruptionColour(disruptionsmsg, route_id, bot, disruptions)
		for disruptiontype, disruption in disruptions.items():
			if disruption:
				splicedisruption = self._splicegen(1024, disruption)
				for i in splicedisruption:
					# print(i)
					disruptionsmsg.add_field(name=disruptiontype, value='\n'.join(i))
		return disruptionsmsg

	def UpdateDisruptions(self, bot):
		disruptions = self.get_disruptions()["disruptions"]["metro_train"]
		bot.routeservicestatus = self.get_routes(route_types=0)
		newdisruptions = {"1":[], "2":[],"3":[],"4":[],"5":[],"6":[],"7":[],"8":[],"9":[],"10":[],"11":[],"12":[],"13":[],"14":[],"15":[],"16":[],"17":[]}
		notuptodatedisruptions = []
		for disruption in disruptions:
			for route in disruption["routes"]:
				try:
					newdisruptions[str(route["route_id"])].append(disruption)
				except KeyError:
					pass
		with open('./InfoFiles/disruptions.json','r') as f:
			previousdisruptions = json.load(f)
		with open('./InfoFiles/disruptions.json','w') as f:
			f.write(json.dumps(newdisruptions))
		for key, value in newdisruptions.items():
			if previousdisruptions[key] != value:
				notuptodatedisruptions.append(key)
		return newdisruptions, notuptodatedisruptions

	def getDepartureInfos(self, station):
		data = {}
		# with open('./InfoFiles/directions.json', 'r') as f:
		# 	directionss = json.load(f)
		# with open('./InfoFiles/stations.json', 'r') as f:
		# 	stations = json.load(f)
		# station = Stations[station.upper()].value
		# station = station.title()
		# try:
		#	 station = stations[station.replace(' Station', '')]
		# except KeyError:
		#	 return('Error, station not found')
		data['Station'] = station
		# print(Directions)
		Directions = self._callApi(f"/v3/departures/route_type/{station['route_type']}/stop/{station['stop_id']}", params={"expand":["all"]})
		data['Directions'] = Directions['directions']
		# for route in station['routes']:
		#	 for direction in directionss[str(route)]:
		#		 if not direction in data['Directions']:
		#			 data['Directions'].append(direction)
		stopid = station['stop_id']
		urls = []
		for direction_id, direction in data['Directions'].items():
			urls.append(self._getUrl(f"/v3/departures/route_type/{station['route_type']}/stop/{stopid}", params={"direction_id":direction_id, "max_results":3, "expand":["run"]}))
			# NextTrain = PTV.get_departure_from_stop(RouteType.TRAIN, stopid, direction_id=direction['direction_id'], max_results=3).get('departures')[0:3]
		urls.append(self._getUrl(f"/v3/disruptions/stop/{stopid}", params={"disruption_status":'current'}))
		rs = (grequests.get(u) for u in urls)
		rs = grequests.map(rs)
		data['Departures'] = []
		for i in rs[:-1]:
			i = i.json()
			i['departures'] = i['departures'][0:3]
			i['runs'] = i['runs']
			data['Departures'].append(i)
		data['Disruptions'] = (rs[-1].json())
		print(data)
		return data
		