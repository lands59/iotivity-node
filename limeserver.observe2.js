// Copyright 2016 Intel Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var intervalId,
	handleReceptacle = {},
	iotivity = require( "iotivity-node/lowlevel" ),
	cnt = 0,	
	observerIds = [],
	sampleUri = "/oic/limeiot";

var sensor = require('./sensor.manager.js');

console.log( "Starting OCF stack in server mode" );

// Start iotivity and set up the processing loop
iotivity.OCInit( null, 0, iotivity.OCMode.OC_SERVER );

iotivity.OCSetDeviceInfo( {
	specVersion: "res.1.0.0",
	dataModelVersions: [ "abc.0.0.1" ],
	deviceName: "server.get",
	types: []
} );
iotivity.OCSetPlatformInfo( {
	platformID: "server.get.sample",
	manufacturerName: "iotivity-node"
} );

intervalId = setInterval( function() {
	iotivity.OCProcess();
}, 1000 );


var sm = new sensor.SensorManager();




console.log( "Registering resource" );
// Create a new resource
iotivity.OCCreateResource(
	// The bindings fill in this object
	handleReceptacle,
	//Types
	"oic.lime.temperature",
	//Interfaces	
	iotivity.OC_RSRVD_INTERFACE_DEFAULT,
	//URI	
	sampleUri,
	function( flag, request ) {
		console.log( "Entity handler called with flag = " + flag + " and the following request:" );
		console.log( JSON.stringify( request, null, 4 ) );
	

		//옵저버 등록
		if ( flag & iotivity.OCEntityHandlerFlag.OC_OBSERVE_FLAG ) {
			if ( request.obsInfo.obsId !== 0 ) {
				if ( request.obsInfo.action === iotivity.OCObserveAction.OC_OBSERVE_REGISTER ) {

					// Add new observer to list.
					observerIds.push( request.obsInfo.obsId );
				} else if ( request.obsInfo.action ===
						iotivity.OCObserveAction.OC_OBSERVE_DEREGISTER ) {

					// Remove requested observer from list.
					observerIdIndex = observerIds.indexOf( request.obsInfo.obsId );
					if ( observerIdIndex >= 0 ) {
						observerIds.splice( observerIdIndex, 1 );
					}
					process.exit( 0 );
				}
			}

			iotivity.OCDoResponse( {
				requestHandle: request.requestHandle,
				resourceHandle: request.resource,
				ehResult: iotivity.OCEntityHandlerResult.OC_EH_OK,
				payload: null,
				resourceUri: sampleUri,
				sendVendorSpecificHeaderOptions: []
			} );
		}


		//연결
		var onConnected = function(type, connected) {
		    	console.log(type + '\tConnected : ' + connected);
			iotivity.OCNotifyListOfObservers(
				handleReceptacle.handle,
				observerIds,
				{
					type: iotivity.OCPayloadType.PAYLOAD_TYPE_REPRESENTATION,
					values: {
						type : type,
						status : connected
					}
				},
				iotivity.OCQualityOfService.OC_HIGH_QOS );
		};

		//배열({습,온...}, {밝기}, {모션})
		var onRecieved = function(type, values, description) {
			var renameType;
			switch(type){
				case "TEMPHUMID" : 
					renameType = "oic.r.temperature";
					break;
				case "BRIGHTNESS" :
					renameType = "oic.r.brightness";
					break;
				case "MOTION" :
					renameType = "oic.r.sensor.motion";
					break;
				default :
					renameType = "Unknown Type";
			}

			console.log(type + '\tRecieved : ' + values);

			iotivity.OCNotifyListOfObservers(
				handleReceptacle.handle,
				observerIds,
				{
					type: iotivity.OCPayloadType.PAYLOAD_TYPE_REPRESENTATION,
					values: 
					{
						type : renameType,
						description : description,
						values : values
					}
					
				},
				iotivity.OCQualityOfService.OC_HIGH_QOS );
		};
		sm.start(onConnected, onRecieved);
		return iotivity.OCEntityHandlerResult.OC_EH_OK;		
	},
	iotivity.OCResourceProperty.OC_DISCOVERABLE 
	| iotivity.OCResourceProperty.OC_OBSERVABLE
);
console.log( "Server ready" );

/**
//var sm = new sensor.SensorManager();
//sm.start(onConnected, onRecieved);


 * ------------
 * main.js
 * ------------
 *

//Tru, fal
// Callbacks
var onConnected = function(type, connected) {
    // switch(type) {
    // case sensor.type.TEMPHUMID:
    console.log(type + '\tConnected : ' + connected);
    // }
};

//배열({습,온...}, {밝기}, {모션})
var onRecieved = function(type, values) {
    // switch(type) {
    // case sensor.type.TEMPHUMID:
    console.log(type + '\tRecieved : ' + values);
    // }
};

var sm = new sensor.SensorManager();
sm.start(onConnected, onRecieved);



*
 * ------------
 * main end
 * ------------
 **/




// Exit gracefully when interrupted
process.on( "SIGINT", function() {
	console.log( "SIGINT: Quitting..." );

	// Tear down the processing loop and stop iotivity
	clearInterval( intervalId );
	iotivity.OCDeleteResource( handleReceptacle.handle );
	iotivity.OCStop();

	// Exit
	process.exit( 0 );
} );
