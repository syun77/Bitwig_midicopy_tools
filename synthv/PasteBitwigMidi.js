function getClientInfo() {
    return {
        name: "Bitwig MIDIを貼り付け",
        category: "Bitwig MIDI Copy",
        author: "Bitwig MIDI Copy Tools",
        versionNumber: 1,
        minEditorVersion: 0x020000
    };
}

function fail(message) {
    SV.showMessageBox("Bitwig MIDIを貼り付け", message);
    SV.finish();
}

function isFiniteNumber(value) {
    return typeof value === "number" && isFinite(value);
}

function validatePayload(payload) {
    var index;
    var note;

    if (!payload || typeof payload !== "object") {
        return "クリップボードに転送データがありません。";
    }
    if (payload.format !== "bitwig-synthv-midi" || payload.version !== 1) {
        return "クリップボードの内容は対応するBitwig MIDIデータではありません。";
    }
    if (!(payload.notes instanceof Array) || payload.notes.length === 0) {
        return "転送データにノートがありません。";
    }
    for (index = 0; index < payload.notes.length; index++) {
        note = payload.notes[index];
        if (!note || Math.floor(note.pitch) !== note.pitch || note.pitch < 0 || note.pitch > 127) {
            return "ノート" + (index + 1) + "の音程が不正です。";
        }
        if (!isFiniteNumber(note.start) || note.start < 0) {
            return "ノート" + (index + 1) + "の開始位置が不正です。";
        }
        if (!isFiniteNumber(note.duration) || note.duration <= 0) {
            return "ノート" + (index + 1) + "の長さが不正です。";
        }
    }
    return null;
}

function main() {
    var payload;
    var validationError;
    var project;
    var editor;
    var track;
    var group;
    var reference;
    var timeAxis;
    var pasteOffset;
    var index;
    var source;
    var note;

    try {
        payload = JSON.parse(SV.getHostClipboard());
    } catch (error) {
        fail("クリップボードのJSONを解析できません。Bitwig側でコピーを実行してください。");
        return;
    }

    validationError = validatePayload(payload);
    if (validationError !== null) {
        fail(validationError);
        return;
    }

    project = SV.getProject();
    editor = SV.getMainEditor();
    track = editor.getCurrentTrack();
    if (!track) {
        fail("貼り付け先トラックをピアノロールで選択してください。");
        return;
    }

    timeAxis = project.getTimeAxis();
    pasteOffset = Math.round(timeAxis.getBlickFromSeconds(SV.getPlayback().getPlayhead()));
    group = SV.create("NoteGroup");
    group.setName(payload.clipName || "Bitwig MIDI");
    group.setScriptData("bitwigMidiCopy", {
        version: payload.version,
        sourceResolutionBeats: payload.sourceResolutionBeats,
        velocities: payload.notes.map(function(item) { return item.velocity; })
    });

    for (index = 0; index < payload.notes.length; index++) {
        source = payload.notes[index];
        note = SV.create("Note");
        note.setPitch(source.pitch);
        note.setTimeRange(
            Math.round(source.start * SV.QUARTER),
            Math.max(1, Math.round(source.duration * SV.QUARTER))
        );
        note.setLyrics("la");
        group.addNote(note);
    }

    project.addNoteGroup(group);
    reference = SV.create("NoteGroupReference", group);
    reference.setTimeOffset(pasteOffset);
    track.addGroupReference(reference);

    editor.getSelection().clearGroups();
    editor.getSelection().selectGroup(reference);
    SV.showMessageBox(
        "Bitwig MIDIを貼り付け",
        payload.notes.length + "個のノートを新規グループとして貼り付けました。"
    );
    SV.finish();
}
