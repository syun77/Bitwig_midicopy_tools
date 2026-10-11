loadAPI(18);

host.defineController(
   "Community",
   "Bitwig MIDI Copy",
   "0.1.0",
   "5a6986c8-36ee-4a88-9442-597c637a6510",
   "Bitwig MIDI Copy Tools"
);
host.defineMidiPorts(0, 0);

var LISTEN_PORT = 47652;
var STEP_SIZE_BEATS = 1 / 240;
var GRID_WIDTH = 16384;
var GRID_HEIGHT = 128;
var MAX_PACKET_BYTES = 48000;
var clip = null;
var noteCache = {};

function init() {
   clip = host.createArrangerCursorClip(GRID_WIDTH, GRID_HEIGHT);
   clip.scrollToKey(0);
   clip.scrollToStep(0);
   clip.setStepSize(STEP_SIZE_BEATS);

   clip.exists().markInterested();
   clip.getPlayStart().markInterested();
   clip.getPlayStop().markInterested();
   clip.getLoopStart().markInterested();
   clip.getLoopLength().markInterested();
   clip.isLoopEnabled().markInterested();

   clip.addNoteStepObserver(onNoteStepChanged);

   var bound = host.addDatagramPacketObserver(
      "Bitwig MIDI Copy trigger",
      LISTEN_PORT,
      onDatagram
   );
   if (!bound) {
      host.errorln("Bitwig MIDI Copy could not bind UDP port " + LISTEN_PORT);
      host.showPopupNotification("Bitwig MIDI Copy: UDPポートを使用できません");
   }
}

function flush() {}

function exit() {
   noteCache = {};
}

function onNoteStepChanged(step) {
   var key = step.channel() + ":" + step.x() + ":" + step.y();
   if (String(step.state()) === "NoteOn") {
      noteCache[key] = {
         channel: step.channel(),
         pitch: step.y(),
         start: step.x() * STEP_SIZE_BEATS,
         duration: step.duration(),
         velocity: Math.max(1, Math.min(127, Math.round(step.velocity() * 127)))
      };
   } else {
      delete noteCache[key];
   }
}

function onDatagram(data) {
   var request = asciiFromBytes(data);
   var match = /^EXPORT ([0-9]{1,5})$/.exec(request);
   if (!match) {
      return;
   }

   var replyPort = parseInt(match[1], 10);
   if (replyPort < 1 || replyPort > 65535) {
      return;
   }

   if (!clip.exists().get()) {
      sendResponse(replyPort, JSON.stringify({
         ok: false,
         error: "ArrangerでMIDIクリップを1つ選択してください。"
      }));
      return;
   }

   var playStart = clip.getPlayStart().get();
   var playStop = clip.getPlayStop().get();
   var maximumBeat = GRID_WIDTH * STEP_SIZE_BEATS;
   var notes = [];
   var key;

   if (playStop > maximumBeat + STEP_SIZE_BEATS) {
      sendResponse(replyPort, JSON.stringify({
         ok: false,
         error: "クリップが読み取り上限の" + maximumBeat.toFixed(2) + "拍を超えています。"
      }));
      return;
   }

   for (key in noteCache) {
      if (noteCache.hasOwnProperty(key)) {
         var cached = noteCache[key];
         if (cached.start >= playStart && cached.start < playStop) {
            notes.push({
               pitch: cached.pitch,
               start: cached.start - playStart,
               duration: Math.min(cached.duration, playStop - cached.start),
               velocity: cached.velocity,
               channel: cached.channel
            });
         }
      }
   }

   notes.sort(function(a, b) {
      if (a.start !== b.start) return a.start - b.start;
      if (a.pitch !== b.pitch) return a.pitch - b.pitch;
      return a.channel - b.channel;
   });

   if (notes.length === 0) {
      sendResponse(replyPort, JSON.stringify({
         ok: false,
         error: "選択クリップの読み取り範囲にノートがありません。"
      }));
      return;
   }

   sendResponse(replyPort, JSON.stringify({
      ok: true,
      payload: {
         format: "bitwig-synthv-midi",
         version: 1,
         clipName: "Bitwig MIDI",
         startBeat: 0,
         lengthBeats: playStop - playStart,
         sourceResolutionBeats: STEP_SIZE_BEATS,
         loopEnabled: clip.isLoopEnabled().get(),
         loopStartBeat: clip.getLoopStart().get() - playStart,
         loopLengthBeats: clip.getLoopLength().get(),
         notes: notes
      }
   }));
   host.showPopupNotification("Bitwig MIDI Copy: " + notes.length + "ノートをコピー");
}

function sendResponse(port, text) {
   var count = Math.max(1, Math.ceil(text.length / MAX_PACKET_BYTES));
   var index;
   for (index = 0; index < count; index++) {
      var fragment = text.substring(
         index * MAX_PACKET_BYTES,
         Math.min(text.length, (index + 1) * MAX_PACKET_BYTES)
      );
      var packet = "BMC1 " + index + "/" + count + "\n" + fragment;
      host.sendDatagramPacket("127.0.0.1", port, signedUtf8Bytes(packet));
   }
}

function asciiFromBytes(bytes) {
   var result = "";
   var index;
   for (index = 0; index < bytes.length; index++) {
      result += String.fromCharCode(bytes[index] & 255);
   }
   return result;
}

function signedUtf8Bytes(text) {
   var result = [];
   var index;
   for (index = 0; index < text.length; index++) {
      var code = text.charCodeAt(index);
      if (code < 0x80) {
         pushSignedByte(result, code);
      } else if (code < 0x800) {
         pushSignedByte(result, 0xc0 | (code >> 6));
         pushSignedByte(result, 0x80 | (code & 0x3f));
      } else {
         pushSignedByte(result, 0xe0 | (code >> 12));
         pushSignedByte(result, 0x80 | ((code >> 6) & 0x3f));
         pushSignedByte(result, 0x80 | (code & 0x3f));
      }
   }
   return result;
}

function pushSignedByte(target, value) {
   target.push(value > 127 ? value - 256 : value);
}
