var SCRIPT_TITLE = "選択ノートの歌詞をコピー";

function getClientInfo() {
    return {
        name: SCRIPT_TITLE,
        category: "Bitwig MIDI Copy",
        author: "Bitwig MIDI Copy Tools",
        versionNumber: 1,
        minEditorVersion: 0x020000
    };
}

function compareNotesByTime(left, right) {
    var onsetDifference = left.note.getOnset() - right.note.getOnset();

    if (onsetDifference !== 0) {
        return onsetDifference;
    }
    return left.selectionIndex - right.selectionIndex;
}

function main() {
    var selectedNotes = SV.getMainEditor().getSelection().getSelectedNotes();
    var orderedNotes = [];
    var lyrics = [];
    var index;

    if (selectedNotes.length === 0) {
        SV.showMessageBox(
            SCRIPT_TITLE,
            "歌詞をコピーするノートを選択してください。"
        );
        SV.finish();
        return;
    }

    for (index = 0; index < selectedNotes.length; index++) {
        orderedNotes.push({
            note: selectedNotes[index],
            selectionIndex: index
        });
    }
    orderedNotes.sort(compareNotesByTime);

    for (index = 0; index < orderedNotes.length; index++) {
        lyrics.push(orderedNotes[index].note.getLyrics());
    }

    SV.setHostClipboard(lyrics.join(" "));
    SV.showMessageBox(
        SCRIPT_TITLE,
        lyrics.length + "個のノートの歌詞をコピーしました。"
    );
    SV.finish();
}
