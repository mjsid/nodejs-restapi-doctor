

if(DetectRTC.isRtpDataChannelsSupported == true){
	console.log('isRtpDataChannelsSupported supported');
}else{
	console.log('isRtpDataChannelsSupported not supported');
}


if(DetectRTC.isRtpDataChannelsSupported == true){
	console.log('isRtpDataChannelsSupported supported');
}else{
	console.log('isRtpDataChannelsSupported not supported');
}



console.log('twilio start');
const Video = Twilio.Video;
console.log('twilio end');
var activeRoom;
var previewTracks;
var identity;
var roomName;

// Obtain a token from the server in order to connect to the Room.
if(Video.isSupported){
	console.log('Browser Supported');	
}else{
	console.log('Browser Not Supported');

	// alert('Browser is Not Supported. Please copy paste the link in Chrome.');
	try {navigator.clipboard.writeText((location.pathname+location.search).substr(1)).then(function() {
			alert('Browser Not Supported. Link Has been copied. Paste it in Chrome.');
		}, function(err) {
			alert('Browser is Not Supported. Please copy paste the link in Chrome.');
		});
	}
	catch(err){
		alert('Browser is Not Supported. Please copy paste the link in Chrome.');
	}
	window.stop();
}

console.log('Audio start');

navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
	stream.getTracks().forEach(track => track.stop());
}).catch(err => {
	alert("Mic not detected");
	console.log(err);
});

console.log('Camera start');

navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
	stream.getTracks().forEach(track => track.stop());
}).catch(err => {
	alert("Camera not detected");
	console.log(err);
});





var queryString = window.location.search;
console.log(URLSearchParams);
if(typeof URLSearchParams != 'function'){
	alert('Please use latest browser. [URLSearchParams]');
}
var urlParams = new URLSearchParams(queryString);
var room = urlParams.get("rm");
var token = urlParams.get("tok");
identity = urlParams.get("iden");

roomName = room;

console.log("Joining room '" + roomName + "'...");
var connectOptions = {
	name: roomName
};

if (previewTracks) {
	connectOptions.tracks = previewTracks;
}

try {
	Video.connect(token, connectOptions).then(roomJoined, function(error) {
		console.log("Could not connect to Twilio: " + error.message);
		alert(error.message);
	});
} catch (error) {
	console.log("error", error);
	alert( 'Please use latest browser. [Can not initialize "video connect"]');
}

let pipButtonElement = document.querySelector("#p-in-p");
pipButtonElement.addEventListener("click", async function() {
	let videoElement = document.querySelector("#remote-media video");
	if (typeof videoElement != "undefined" && videoElement != null) {
		pipButtonElement.disabled = true;
		if (!document.pictureInPictureEnabled) {
			alert("PiP is not supported in your browser.");
			return;
		}
		await videoElement.requestPictureInPicture();
		pipButtonElement.disabled = false;
	} else {
		pipButtonElement.disabled = false;
		alert("Doctor is yet to join.");
	}
});

$("#end_call").on("click", function() {
	if(window.room && typeof window.room.disconnect == 'function'){
		window.room.disconnect();
	} else{
		if (activeRoom) {
			activeRoom.disconnect();
			previewTracks = null;
			activeRoom = null;
		}
	}
});

// Attach the Track to the DOM.
function attachTrack(track, container) {
	if (track) {
		container.appendChild(track.attach());
		$("video").attr("controls", false);
	}
}

// Attach array of Tracks to the DOM.
function attachTracks(tracks, container) {
	tracks.forEach(function(track) {
		if (track) {
			container.appendChild(track.attach());
			$("video").attr("controls", false);
		}
	});
}

// Detach given track from the DOM.
function detachTrack(track) {
	track.detach().forEach(function(element) {
		element.remove();
	});
}

// Appends remoteParticipant name to the DOM.
function appendName(identity, container) {
	const name = document.createElement("p");
	name.id = `participantName-${identity}`;
	name.className = "instructions";
	name.textContent = identity;
	container.appendChild(name);
	name.style.display = "none";
}

// Removes remoteParticipant container from the DOM.
function removeName(participant) {
	if (participant) {
		let { identity } = participant;
		const container = document.getElementById(
			`participantContainer-${identity}`
		);
		container.parentNode.removeChild(container);
	}
}

// A newactiveRoom RemoteTrack was published to the Room.
function trackPublished(publication, container) {
	if (publication.isSubscribed) {
		attachTrack(publication.track, container);
	}
	publication.on("subscribed", function(track) {
		console.log("Subscribed to " + publication.kind + " track");
		attachTrack(track, container);
	});
	publication.on("unsubscribed", detachTrack);
}

// A RemoteTrack was unpublished from the Room.
function trackUnpublished(publication) {
	console.log(publication.kind + " track was unpublished.");
}

// A new RemoteParticipant joined the Room
function participantConnected(participant, container) {
	let selfContainer = document.createElement("div");
	selfContainer.id = `participantContainer-${participant.identity}`;

	container.appendChild(selfContainer);
	appendName(participant.identity, selfContainer);

	participant.tracks.forEach(function(publication) {
		trackPublished(publication, selfContainer);
	});
	participant.on("trackPublished", function(publication) {
		trackPublished(publication, selfContainer);
	});
	participant.on("trackUnpublished", trackUnpublished);
}

// Detach the Participant's Tracks from the DOM.
function detachParticipantTracks(participant) {
	var tracks = Array.from(participant.tracks.values()).map(function(
		trackPublication
	) {
		return trackPublication.track;
	});
	detachTracks(tracks);
}

// When we are about to transition away from this page, disconnect
// from the room, if joined.
window.addEventListener("beforeunload", leaveRoomIfJoined);

// Get the Participant's Tracks.
function getTracks(participant) {
	return Array.from(participant.tracks.values())
		.filter(function(publication) {
			return publication.track;
		})
		.map(function(publication) {
			return publication.track;
		});
}

// Successfully connected!
function roomJoined(room) {
	window.room = activeRoom = room;

	try {
		navigator.mediaDevices.enumerateDevices().then(gotDevices);
	} catch (error) {
		console.log(error);
	}
	const select = document.getElementById("video-devices");
	select.addEventListener("change", updateVideoDevice);

	console.log("Joined as '" + identity + "'");

	// Attach LocalParticipant's Tracks, if not already attached.
	var previewContainer = document.getElementById("local-media");
	if (!previewContainer.querySelector("video")) {
		attachParticipantTracks(room.localParticipant, previewContainer);
	}

	// Attach the Tracks of the Room's Participants.
	room.participants.forEach(function(participant) {
		console.log("Already in Room: '" + participant.identity + "'");
		var previewContainer = document.getElementById("remote-media");
		attachParticipantTracks(participant, previewContainer);
	});

	// When a Participant joins the Room, log the event.
	room.on("participantConnected", function(participant) {
		console.log("Joining: '" + participant.identity + "'");
		// participantConnected(participant, remoteMediaContainer);
	});

	// When a Participant leaves the Room, detach its Tracks.
	room.on("participantDisconnected", function(participant) {
		console.log(
			"RemoteParticipant '" + participant.identity + "' left the room"
		);
		detachParticipantTracks(participant);
	});

	// When a Participant adds a Track, attach it to the DOM.
	room.on("trackSubscribed", function(track, trackPublication, participant) {
		console.log(participant.identity + " added track: " + track.kind);
		var previewContainer = document.getElementById("remote-media");
		attachTracks([track], previewContainer);
	});

	// When a Participant removes a Track, detach it from the DOM.
	room.on("trackUnsubscribed", function(
		track,
		trackPublication,
		participant
	) {
		console.log(participant.identity + " removed track: " + track.kind);
		detachTracks([track]);
	});

	// Once the LocalParticipant leaves the room, detach the Tracks
	// of all Participants, including that of the LocalParticipant.
	room.on("disconnected", function() {
		console.log("Left");
		if (previewTracks) {
			previewTracks.forEach(function(track) {
				track.stop();
			});
			previewTracks = null;
		}
		detachParticipantTracks(room.localParticipant);
		room.participants.forEach(detachParticipantTracks);
		activeRoom = null;
		select.removeEventListener("change", updateVideoDevice);

		alert('Consultation Ended');
		setTimeout(function(){ window.close() }, 5000);
	});

	$('.track-off').off('click');
	$('.track-off').on('click', event => {
		room.localParticipant.tracks.forEach((track, trackId) => {
			if(track.kind == $(event.currentTarget).attr('data-type')){
				if($(event.currentTarget).find('img').attr('src').includes('off')){
					$(event.currentTarget).find('img').attr('src', $(event.currentTarget).find('img').attr('src').replace("off", "on"));
					track.track.enable();
				} else{
					$(event.currentTarget).find('img').attr('src', $(event.currentTarget).find('img').attr('src').replace("on", "off"));
					track.track.disable();
				}
			}
		});
	});
}

function gotDevices(mediaDevices) {
	const select = document.getElementById("video-devices");
	select.innerHTML = "";
	select.appendChild(document.createElement("option"));
	let count = 1;
	mediaDevices.forEach(mediaDevice => {
		if (mediaDevice.kind === "videoinput") {
			const option = document.createElement("option");
			option.value = mediaDevice.deviceId;
			const label = mediaDevice.label || `Camera ${count++}`;
			const textNode = document.createTextNode(label);
			option.appendChild(textNode);
			select.appendChild(option);
		}
	});
}

function updateVideoDevice(event) {
	const select = event.target;
	const localParticipant = activeRoom.localParticipant;
	if (select.value !== "") {
		const tracks = Array.from(localParticipant.videoTracks.values()).map(
			function(trackPublication) {
				return trackPublication.track;
			}
		);
		localParticipant.unpublishTracks(tracks);
		console.log(
			localParticipant.identity + " removed track: " + tracks[0].kind
		);
		detachTracks(tracks);
		stopTracks(tracks);
		Video.createLocalVideoTrack({
			deviceId: { exact: select.value }
		}).then(function(localVideoTrack) {
			localParticipant.publishTrack(localVideoTrack);
			console.log(
				localParticipant.identity +
					" added track: " +
					localVideoTrack.kind
			);
			const previewContainer = document.getElementById("local-media");
			attachTracks([localVideoTrack], previewContainer);
			$('#video-opd-controls [data-type="video"] img').attr("src",$('#video-opd-controls [data-type="video"] img').attr("src").replace("-on", "-off"));
		});
	}
}

function stopTracks(tracks) {
	tracks.forEach(function(track) {
		if (track) {
			track.stop();
		}
	});
}

// Detach the Tracks from the DOM.
function detachTracks(tracks) {
	tracks.forEach(function(track) {
		if (track) {
			track.detach().forEach(function(detachedElement) {
				detachedElement.remove();
			});
		}
	});
}

// Attach the Participant's Tracks to the DOM.
function attachParticipantTracks(participant, container) {
	var tracks = Array.from(participant.tracks.values()).map(function(
		trackPublication
	) {
		return trackPublication.track;
	});
	attachTracks(tracks, container);
}

// Leave Room.
function leaveRoomIfJoined() {
	if (activeRoom) {
		activeRoom.disconnect();
	}
}