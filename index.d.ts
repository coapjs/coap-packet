export type OptionName =
    | "If-Match"
    | "Uri-Host"
    | "ETag"
    | "If-None-Match"
    | "Observe"
    | "Uri-Port"
    | "Location-Path"
    | "Uri-Path"
    | "OSCORE"
    | "Content-Format"
    | "Max-Age"
    | "Uri-Query"
    | "Hop-Limit"
    | "Accept"
    | "Q-Block1"
    | "Location-Query"
    | "Block2"
    | "Block1"
    | "Size2"
    | "Q-Block2"
    | "Proxy-Uri"
    | "Proxy-Scheme"
    | "Size1"
    | "No-Response"
    | "OCF-Accept-Content-Format-Version"
    | "OCF-Content-Format-Version";

export type CoapMethod = "GET" | "POST" | "PUT" | "DELETE" | "FETCH" | "PATCH" | "iPATCH";

export interface Packet {
    token?: Buffer;
    code?: CoapMethod | string;
    messageId?: number;
    payload?: Buffer;
    options?: (Option | NamedOption)[];
    confirmable?: boolean;
    reset?: boolean;
    ack?: boolean;
}

export interface ParsedPacket {
    code: string;
    confirmable: boolean;
    reset: boolean;
    ack: boolean;
    messageId: number;
    token: Buffer;
    options: {
        name: OptionName | number,
        value: Buffer
    }[];
    payload: Buffer;
}

export interface NamedOption {
    name: OptionName;
    value: Buffer;
}

export interface Option {
    name: number | string;
    value: Buffer;
}

export function generate(packet: Packet, maxLength?: number): Buffer;
export function parse(buffer: Buffer): ParsedPacket;
