let localStream;
let peerConnection;
let uuid;
let uuidInput;
let serverConnection;

let isCaller = true;
let caller;

const peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.stunprotocol.org:3478'},
    // {'urls': 'stun:stun.l.google.com:19302'},
  ]
};

function pageReady() {
  uuid = createUUID();
  document.getElementById('uuid').innerText = uuid;

  uuidInput = document.getElementById('call-id');

  serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
  serverConnection.onmessage = gotMessageFromServer;

  navigator
    .mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then(stream => {
      localStream = stream;
      document.getElementById('localVideo').srcObject = stream;
    })
    .catch(errorHandler);
}

function gotMessageFromServer(message) {
  if(!peerConnection) {
    isCaller = false;
    start();
  }

  let signal = JSON.parse(message.data);

  if(signal.uuid === uuid) return;

  if(signal.sdp && signal.call === uuid) {
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(signal.sdp))
      .then(function() {
        if(signal.sdp.type === 'offer') {
          caller = signal.uuid;
          peerConnection
            .createAnswer()
            .then(createdDescription)
            .catch(errorHandler);
        }
      }).catch(errorHandler);
  } else if(signal.ice && signal.call === uuid) {
    peerConnection
      .addIceCandidate(new RTCIceCandidate(signal.ice))
      .catch(errorHandler);
  }
}

function start() {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;
  peerConnection.addStream(localStream);

  if(isCaller) {
    peerConnection
      .createOffer()
      .then(createdDescription)
      .catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if(event.candidate) {
    serverConnection
      .send(JSON.stringify({
        'ice': event.candidate, 
        'uuid': uuid,
        'call': isCaller ? uuidInput.value : caller
      }));
  }
}

function createdDescription(description) {
  peerConnection
    .setLocalDescription(description)
    .then(function() {
      serverConnection
        .send(JSON.stringify({
          'sdp': peerConnection.localDescription,
          'uuid': uuid,
          'call': isCaller ? uuidInput.value : caller
        }));
    }).catch(errorHandler);
}

function gotRemoteStream(event) {
  document.getElementById('remoteVideo').srcObject = event.streams[0];
}

function errorHandler(error) {
  console.error(error);
}

function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

pageReady();

window.addEventListener('beforeunload', () => { 
  serverConnection.close();
});