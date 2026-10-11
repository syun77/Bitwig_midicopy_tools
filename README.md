# Bitwig MIDI Copy Tools

Bitwig Studioで選択したArranger MIDIクリップを、OSクリップボード経由で
Synthesizer V Studio 2 Proへ転送するツールです。

対象構成は、Bitwig Studio内で動作する通常のSynthesizer V Studio 2 Pro
VST3プラグインです。貼り付けるたびに新しいノートグループを作成し、既存の
歌詞や調声済みグループには触れません。

## 動作の流れ

1. BitwigでArrangerのMIDIクリップを1つ選択します。
2. `python3 bridge/copy_from_bitwig.py`を実行します。
3. Synthesizer Vプラグインを開き、転送先トラックをピアノロールに表示します。
4. Synthesizer Vのスクリプト一覧から「Bitwig MIDIを貼り付け」を実行します。

貼り付け位置は、Synthesizer Vプラグインの現在の再生カーソル位置です。
Bitwig Controller APIからArrangerクリップの絶対配置位置を取得できないため、
絶対位置モードは提供していません。

## インストール

### 1. Bitwig Controllerスクリプト

`bitwig/BitwigMidiCopy.control.js`を次へコピーします。

```text
~/Documents/Bitwig Studio/Controller Scripts/BitwigMidiCopy/
```

Bitwigを再起動し、Settings > Controllersで
`Community / Bitwig MIDI Copy`を手動追加してください。MIDIポートは不要です。

### 2. Synthesizer Vスクリプト

`synthv/PasteBitwigMidi.js`を次へコピーします。

```text
~/Library/Application Support/Dreamtonics/Synthesizer V Studio 2/scripts/
```

Synthesizer Vのスクリプトメニューを再読み込みし、任意のショートカットを
「Bitwig MIDIを貼り付け」に割り当てます。

### 3. Bitwig側コピーのショートカット

Bitwig Controller APIは拡張独自のキーボードコマンドを登録できません。
macOSのショートカット、Automatorのクイックアクション、ランチャーなどから、
次を実行するショートカットを作成してください。

```sh
python3 /absolute/path/to/Bitwig_midicopy_tools/bridge/copy_from_bitwig.py
```

成功するとJSONがクリップボードへ入り、Bitwigに通知が表示されます。

## MVPの制限

- 1回に転送できるのは、選択中のArranger MIDIクリップ1つです。
- 読み取り範囲はクリップ先頭から約68.27拍です。
- ノート開始位置の解像度は1/240拍です。長さはBitwigが返す値を保持します。
- ループ反復は展開しません。Controller APIが公開する元クリップのノートだけを転送します。
- クリップ名はController APIから取得できないため、グループ名は`Bitwig MIDI`です。
- VelocityはJSONに保持しますが、Synthesizer VのNote APIに対応プロパティがないため音符には適用しません。
- MIDI CC、ピッチベンド、歌詞、ノート表現は転送しません。

## 開発・検証

```sh
python3 -m unittest discover -s tests -v
```

実機確認手順は[docs/manual-test.md](docs/manual-test.md)を参照してください。
