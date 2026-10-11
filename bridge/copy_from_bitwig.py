#!/usr/bin/env python3
"""Request the selected Bitwig clip and place its JSON on the macOS clipboard."""

from __future__ import annotations

import argparse
import json
import math
import socket
import subprocess
import sys
from dataclasses import dataclass, field


BITWIG_ADDRESS = ("127.0.0.1", 47652)
PROTOCOL_PREFIX = b"BMC1 "


class BridgeError(RuntimeError):
    """Raised when Bitwig returns invalid data or cannot be reached."""


@dataclass
class PacketCollector:
    total: int | None = None
    fragments: dict[int, bytes] = field(default_factory=dict)

    def add(self, packet: bytes) -> str | None:
        if not packet.startswith(PROTOCOL_PREFIX) or b"\n" not in packet:
            raise BridgeError("Bitwigから不正な応答を受信しました。")

        header, fragment = packet.split(b"\n", 1)
        try:
            position = header[len(PROTOCOL_PREFIX) :].decode("ascii")
            index_text, total_text = position.split("/", 1)
            index = int(index_text)
            total = int(total_text)
        except (UnicodeDecodeError, ValueError) as error:
            raise BridgeError("Bitwigから不正な分割ヘッダーを受信しました。") from error

        if total < 1 or index < 0 or index >= total:
            raise BridgeError("Bitwigから範囲外の分割番号を受信しました。")
        if self.total is not None and self.total != total:
            raise BridgeError("Bitwigの応答パケット数が途中で変化しました。")

        self.total = total
        self.fragments[index] = fragment
        if len(self.fragments) != total:
            return None

        try:
            return b"".join(self.fragments[index] for index in range(total)).decode("utf-8")
        except (KeyError, UnicodeDecodeError) as error:
            raise BridgeError("Bitwigの応答を復元できませんでした。") from error


def request_export(timeout: float) -> dict:
    collector = PacketCollector()
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as connection:
        connection.bind(("127.0.0.1", 0))
        connection.settimeout(timeout)
        reply_port = connection.getsockname()[1]
        connection.sendto(f"EXPORT {reply_port}".encode("ascii"), BITWIG_ADDRESS)

        while True:
            try:
                packet, address = connection.recvfrom(65535)
            except TimeoutError as error:
                raise BridgeError(
                    "Bitwigから応答がありません。Controller設定でBitwig MIDI Copyを追加してください。"
                ) from error
            if address[0] not in {"127.0.0.1", "::1"}:
                continue
            assembled = collector.add(packet)
            if assembled is not None:
                break

    try:
        response = json.loads(assembled)
    except json.JSONDecodeError as error:
        raise BridgeError("Bitwigの応答JSONを解析できませんでした。") from error

    if not isinstance(response, dict) or not response.get("ok"):
        message = response.get("error") if isinstance(response, dict) else None
        raise BridgeError(message or "Bitwigでクリップを読み取れませんでした。")
    payload = response.get("payload")
    validate_payload(payload)
    return payload


def validate_payload(payload: object) -> None:
    if not isinstance(payload, dict):
        raise BridgeError("転送データ本体がありません。")
    if payload.get("format") != "bitwig-synthv-midi" or payload.get("version") != 1:
        raise BridgeError("未対応の転送データ形式です。")
    notes = payload.get("notes")
    if not isinstance(notes, list) or not notes:
        raise BridgeError("転送できるノートがありません。")
    for note in notes:
        if not isinstance(note, dict):
            raise BridgeError("ノートデータが不正です。")
        pitch = note.get("pitch")
        start = note.get("start")
        duration = note.get("duration")
        velocity = note.get("velocity")
        if isinstance(pitch, bool) or not isinstance(pitch, int) or not 0 <= pitch <= 127:
            raise BridgeError("ノート番号が範囲外です。")
        if (
            isinstance(start, bool)
            or not isinstance(start, (int, float))
            or not math.isfinite(start)
            or start < 0
        ):
            raise BridgeError("ノート開始位置が不正です。")
        if (
            isinstance(duration, bool)
            or not isinstance(duration, (int, float))
            or not math.isfinite(duration)
            or duration <= 0
        ):
            raise BridgeError("ノート長が不正です。")
        if (
            isinstance(velocity, bool)
            or not isinstance(velocity, int)
            or not 1 <= velocity <= 127
        ):
            raise BridgeError("Velocityが範囲外です。")


def write_macos_clipboard(text: str) -> None:
    try:
        subprocess.run(
            ["/usr/bin/pbcopy"],
            input=text.encode("utf-8"),
            check=True,
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError) as error:
        raise BridgeError("macOSクリップボードへ書き込めませんでした。") from error


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="選択中のBitwig MIDIクリップをクリップボードへコピーします。"
    )
    parser.add_argument("--timeout", type=float, default=2.0, help="応答待ち秒数")
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="クリップボードへ書かずJSONを標準出力します（テスト用）",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        payload = request_export(args.timeout)
        serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        if args.stdout:
            print(serialized)
        else:
            write_macos_clipboard(serialized)
            print(f"Bitwigから{len(payload['notes'])}ノートをコピーしました。")
        return 0
    except BridgeError as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
