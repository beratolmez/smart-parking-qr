import { networkInterfaces } from "node:os";
import { pathToFileURL } from "node:url";

export function pickLanIp(interfaces) {
  for (const addresses of Object.values(interfaces)) {
    const lan = addresses.find(
      (a) => a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254."),
    );
    if (lan) return lan.address;
  }
  return null;
}

function main() {
  const all = networkInterfaces();
  const candidates = Object.entries(all)
    .flatMap(([name, addresses]) =>
      addresses
        .filter((a) => a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254."))
        .map((a) => ({ name, ...a })),
    );

  if (process.argv.includes("--all")) {
    if (candidates.length === 0) {
      console.error("No LAN IPv4 address found (is a network adapter connected?).");
      process.exit(1);
    }
    candidates.forEach((c, i) => {
      console.log(`${i + 1}. ${c.address} (${c.name})`);
    });
    return;
  }

  const ip = pickLanIp(all);
  if (!ip) {
    console.error(
      "No usable LAN IPv4 address found. Connect to a network, or use --all to list candidates.",
    );
    process.exit(1);
  }
  console.log(ip);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main();
}
