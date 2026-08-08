import { describe, expect, it } from "vitest";
import { pickLanIp } from "./lan-ip.mjs";

describe("pickLanIp", () => {
  it("loopback ile birlikte LAN IPv4 varsa LAN adresini seçer", () => {
    const interfaces = {
      lo: [
        { address: "127.0.0.1", family: "IPv4", internal: true },
      ],
      eth0: [
        { address: "192.168.1.42", family: "IPv4", internal: false },
      ],
    };
    expect(pickLanIp(interfaces)).toBe("192.168.1.42");
  });

  it("yalnızca loopback varsa null döner", () => {
    const interfaces = {
      lo: [
        { address: "127.0.0.1", family: "IPv4", internal: true },
      ],
    };
    expect(pickLanIp(interfaces)).toBeNull();
  });

  it("yalnızca IPv6 varsa null döner", () => {
    const interfaces = {
      eth0: [
        { address: "fe80::1", family: "IPv6", internal: false },
      ],
    };
    expect(pickLanIp(interfaces)).toBeNull();
  });

  it("yalnızca APIPA ve loopback varsa null döner", () => {
    const interfaces = {
      lo: [
        { address: "127.0.0.1", family: "IPv4", internal: true },
      ],
      eth0: [
        { address: "169.254.10.5", family: "IPv4", internal: false },
      ],
    };
    expect(pickLanIp(interfaces)).toBeNull();
  });

  it("APIPA ve loopback ile birlikte LAN IPv4 varsa LAN adresini seçer", () => {
    const interfaces = {
      lo: [
        { address: "127.0.0.1", family: "IPv4", internal: true },
      ],
      eth0: [
        { address: "169.254.10.5", family: "IPv4", internal: false },
      ],
      eth1: [
        { address: "10.0.0.7", family: "IPv4", internal: false },
      ],
    };
    expect(pickLanIp(interfaces)).toBe("10.0.0.7");
  });

  it("birden çok LAN IPv4 varsa ilk geçerli adayı döner", () => {
    const interfaces = {
      wlan0: [
        { address: "192.168.0.104", family: "IPv4", internal: false },
      ],
      eth0: [
        { address: "172.22.128.1", family: "IPv4", internal: false },
      ],
    };
    expect(pickLanIp(interfaces)).toBe("192.168.0.104");
  });
});
