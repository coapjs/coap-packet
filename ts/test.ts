import { Packet, NamedOption, parse as parseCoap, generate as encodeCoap } from "../index";

const packet: Packet = {
    code: "POST",
    options: [
        {
            name: "Block2",
            value: Buffer.from("foo")
        } as NamedOption,
        {
            name: "5",
            value: Buffer.from("bar")
        }
    ],
    payload: Buffer.from("baz"),
    confirmable: false
};

const encoded = encodeCoap(packet);

const parsed = parseCoap(encoded);
parsed.code.charAt(0);
