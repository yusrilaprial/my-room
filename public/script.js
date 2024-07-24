const socket = io();
let localStream;
const localVideo = document.querySelector(".local-video");
const videoGrid = document.querySelector(".video-grid");
const roomIdInput = document.getElementById("room-id");
const joinRoomButton = document.getElementById("join-room");

let peerConnections = {};

joinRoomButton.addEventListener("click", async () => {
  const roomId = roomIdInput.value;
  if (roomId) {
    await getUserMedia();
    socket.emit("join room", roomId);
  }
});

socket.on("all users", (users) => {
  users.forEach((userId) => {
    if (userId !== socket.id) {
      createPeerConnection(userId);
    }
  });
});

socket.on("user joined", (userId) => {
  if (userId !== socket.id && !peerConnections[userId]) {
    createPeerConnection(userId);
  }
});

socket.on("offer", async ({offer, from}) => {
  await createPeerConnection(from);
  await peerConnections[from].setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnections[from].createAnswer();
  await peerConnections[from].setLocalDescription(new RTCSessionDescription(answer));
  socket.emit("answer", {answer, to: from});
});

socket.on("answer", async ({answer, from}) => {
  await peerConnections[from].setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice candidate", async ({iceCandidate, from}) => {
  try {
    const candidate = new RTCIceCandidate(iceCandidate);
    await peerConnections[from].addIceCandidate(candidate);
  } catch (error) {
    console.error("Error adding received ice candidate", error);
  }
});

async function getUserMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
    localVideo.srcObject = localStream;
  } catch (error) {
    console.error("Error accessing media devices.", error);
  }
}

function createPeerConnection(targetId) {
  const peer = new RTCPeerConnection({
    iceServers: [
      {urls: "stun:stun.stunprotocol.org"},
      {
        urls: "turn:numb.viagenie.ca",
        username: "webrtc@live.com",
        credential: "muazkh",
      },
    ],
  });

  localStream.getTracks().forEach((track) => {
    peer.addTrack(track, localStream);
  });

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice candidate", {iceCandidate: event.candidate, to: targetId});
    }
  };

  peer.ontrack = (event) => {
    const remoteStream = event.streams[0];
    let remoteVideo = document.querySelector(`#video-${targetId}`);
    if (!remoteVideo) {
      remoteVideo = document.createElement("video");
      remoteVideo.id = `video-${targetId}`;
      remoteVideo.autoplay = true;
      remoteVideo.playsinline = true;
      videoGrid.appendChild(remoteVideo);
    }
    remoteVideo.srcObject = remoteStream;
  };

  peer.onnegotiationneeded = async () => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(new RTCSessionDescription(offer));
    socket.emit("offer", {offer, to: targetId});
  };

  peerConnections[targetId] = peer;
}
