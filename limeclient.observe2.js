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
	sampleUri = "/oic/limeiot",
	// This is the same value as server.get.js
	resourceMissing = true,
	iotivity = require( "iotivity-node/lowlevel" );
	

console.log( "Starting OCF stack in client mode" );

// Start iotivity and set up the processing loop
iotivity.OCInit( null, 0, iotivity.OCMode.OC_CLIENT );

intervalId = setInterval( function() {
	iotivity.OCProcess();
}, 1000 );

console.log( "Issuing discovery request" );


// Discover resources and list them
iotivity.OCDoResource(

	// The bindings fill in this object
	handleReceptacle,

	iotivity.OCMethod.OC_REST_DISCOVER,

	// Standard path for discovering resources
	iotivity.OC_MULTICAST_DISCOVERY_URI,

	// There is no destination
	null,

	// There is no payload
	null,
	iotivity.OCConnectivityType.CT_DEFAULT,
	iotivity.OCQualityOfService.OC_HIGH_QOS,
	function( handle, response ) {
		console.log( "Received response to DISCOVER request:" );
		console.log( JSON.stringify( response, null, 4 ) );
		var index,
			destination = response.addr,
			observeHandleReceptacle = {},
			resources = response && response.payload && response.payload.resources,
			resourceCount = resources ? resources.length : 0,
			observeResponseHandler = function( handle, response ) {

				console.log( "Received response to OBSERVE request:" );
				console.log( JSON.stringify( response, null, 4 ) );				
				return iotivity.OCStackApplicationResult.OC_STACK_KEEP_TRANSACTION;
				
			};

		if ( resourceMissing ) {

			// If the sample URI is among the resources, issue the OBSERVE request to it
			for ( index = 0; index < resourceCount; index++ ) {
				if ( resources[ index ].uri === sampleUri ) {
					resourceMissing = false;

					console.log( "Observing " + sampleUri );

					iotivity.OCDoResource(
						observeHandleReceptacle,
						iotivity.OCMethod.OC_REST_OBSERVE,
						sampleUri,
						destination,
						null,
						iotivity.OCConnectivityType.CT_DEFAULT,
						iotivity.OCQualityOfService.OC_HIGH_QOS,
						observeResponseHandler,
						null );
				}
			}
		}

		return iotivity.OCStackApplicationResult.OC_STACK_KEEP_TRANSACTION;
	},

	// There are no header options
	null );

// Exit gracefully when interrupted (Ctri + C)
process.on( "SIGINT", function() {

	console.log( "SIGINT: Quitting..." );

	// Tear down the processing loop and stop iotivity
	clearInterval( intervalId );
	iotivity.OCStop();

	// Exit
	process.exit( 0 );
} );
