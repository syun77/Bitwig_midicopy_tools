import json
import math
import unittest

from bridge.copy_from_bitwig import BridgeError, PacketCollector, validate_payload


def valid_payload():
    return {
        "format": "bitwig-synthv-midi",
        "version": 1,
        "notes": [
            {"pitch": 60, "start": 0.0, "duration": 1.0, "velocity": 100}
        ],
    }


class PacketCollectorTests(unittest.TestCase):
    def test_reassembles_out_of_order_packets(self):
        collector = PacketCollector()
        self.assertIsNone(collector.add(b"BMC1 1/2\nworld"))
        self.assertEqual(collector.add(b"BMC1 0/2\nhello "), "hello world")

    def test_rejects_inconsistent_packet_count(self):
        collector = PacketCollector()
        collector.add(b"BMC1 0/2\nfirst")
        with self.assertRaises(BridgeError):
            collector.add(b"BMC1 1/3\nsecond")

    def test_rejects_unknown_protocol(self):
        with self.assertRaises(BridgeError):
            PacketCollector().add(b"OTHER 0/1\n{}")


class PayloadValidationTests(unittest.TestCase):
    def test_accepts_valid_payload(self):
        validate_payload(valid_payload())

    def test_accepts_json_round_trip(self):
        payload = json.loads(json.dumps(valid_payload()))
        validate_payload(payload)

    def test_rejects_empty_notes(self):
        payload = valid_payload()
        payload["notes"] = []
        with self.assertRaises(BridgeError):
            validate_payload(payload)

    def test_rejects_out_of_range_pitch(self):
        payload = valid_payload()
        payload["notes"][0]["pitch"] = 128
        with self.assertRaises(BridgeError):
            validate_payload(payload)

    def test_rejects_non_positive_duration(self):
        payload = valid_payload()
        payload["notes"][0]["duration"] = 0
        with self.assertRaises(BridgeError):
            validate_payload(payload)

    def test_rejects_non_finite_timing(self):
        payload = valid_payload()
        payload["notes"][0]["start"] = math.nan
        with self.assertRaises(BridgeError):
            validate_payload(payload)


if __name__ == "__main__":
    unittest.main()
