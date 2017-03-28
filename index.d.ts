export type OptionName =
    | "If-Match"
    | "Uri-Host"
    | "ETag"
    | "If-None-Match"
    | "Observe"
    | "Uri-Port"
    | "Location-Path"
    | "Uri-Path"
    | "Content-Format"
    | "Max-Age"
    | "Uri-Query"
    | "Accept"
    | "Location-Query"
    | "Block2"
    | "Block1"
    | "Proxy-Uri"
    | "Proxy-Scheme"
    | "Size1";

export type CoapMethod = "GET" | "POST" | "PUT" | "DELETE";

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

export function generate(packet: Packet): Buffer;
export function parse(buffer: Buffer): ParsedPacket;
