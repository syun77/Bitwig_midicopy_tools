# Progress

## Current task

Implement the proposed Bitwig Studio to Synthesizer V Studio 2 Pro MIDI-note transfer MVP.

## Status

Implementation complete; in-application manual verification remains for the user.

## Completed / findings

- Read the supplied Japanese specification and inspected the currently empty repository.
- Verified the local environment contains Bitwig Studio 6.0.11, Synthesizer V Studio 2 Pro standalone, the regular VST3 plug-in, and the ARA VST3 plug-in.
- Verified from Bitwig's bundled Controller API docs that a selected Arranger clip can be followed and notes can be observed through a finite step grid.
- Verified that Controller extensions cannot register a custom Bitwig keyboard command and that the clip API does not expose an Arranger clip's absolute timeline position.
- Verified from Dreamtonics' official scripting documentation that Synthesizer V Studio 2 scripts can read the OS clipboard and create notes/groups/tracks.
- Implemented the Bitwig Controller script, chunked local UDP bridge, macOS clipboard helper, and ES5 Synthesizer V paste script for the regular VST3 workflow.
- Added strict payload validation, automated bridge tests, installation documentation, and an in-application manual test checklist.

## Decisions and assumptions

- The specification requires revision: a keyboard trigger needs a small external/local trigger or MIDI binding, and absolute-position mode cannot be implemented from the documented Controller API alone.
- The implemented design is a Bitwig Controller script plus local trigger/clipboard bridge plus an ES5 Synthesizer V paste script.
- Paste placement is the Synthesizer V plug-in playback cursor. Each paste creates a new group on the current track.
- The finite Bitwig note grid covers about 68.27 beats at 1/240-beat onset resolution. Longer clips fail explicitly instead of truncating silently.

## Files changed

- `AGENTS.md`
- `PROGRESS.md`
- `.gitignore`
- `README.md`
- `bitwig/BitwigMidiCopy.control.js`
- `bridge/__init__.py`
- `bridge/copy_from_bitwig.py`
- `docs/manual-test.md`
- `synthv/PasteBitwigMidi.js`
- `tests/test_bridge.py`

## Verification

- Inspected Bitwig's bundled 6.0.11 Javadocs for `ControllerHost`, `Application`, `Clip`, `CursorClip`, and `NoteStep`.
- Checked installed Synthesizer V application and plug-in bundles.
- Consulted Dreamtonics' official scripting documentation for clipboard and note-group APIs.
- `python3 -m unittest discover -s tests -v` passed (9 tests).
- `python3 -m py_compile bridge/copy_from_bitwig.py tests/test_bridge.py` passed.
- Both JavaScript files passed a JXA parse-only syntax check.
- `git diff --check` passed.

## Next steps

- Install both host scripts using the README instructions.
- Run `docs/manual-test.md` in Bitwig and the regular Synthesizer V Studio 2 Pro VST3 plug-in; host behavior cannot be verified by the repository's automated tests.
