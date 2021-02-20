import {
  discoverGateway,
  TradfriClient,
  AccessoryTypes,
} from "node-tradfri-client";
import dotenv from "dotenv";

dotenv.config();
const discovered = await discoverGateway(false);

const tradfri = new TradfriClient(discovered.host);
try {
  const { identity, psk } = await tradfri.authenticate(
    process.env.SECURITY_CODE
  );
  await tradfri.connect(identity, psk);

  const allDevices = [];
  await tradfri
    .on("device updated", (device) => allDevices.push(device))
    .observeDevices();

  const command = process.argv[2];
  if (command === "list") {
    const verbose = process.argv[3] === "--verbose";
    if (verbose) {
      allDevices.forEach((device) => {
        console.log(JSON.stringify(device, null, 4));
      });
    } else {
      console.log(
        "InstanceId".padEnd(12) + "Alive".padEnd(6) + "Name".padEnd(40)
      );
      allDevices.forEach((device) => {
        console.log(
          String(device.instanceId).padEnd(12) +
            String(device.alive).padEnd(6) +
            String(device.name).padEnd(40)
        );
      });
    }
  } else if (command === "toggle") {
    const targetInstanceId = process.argv[3];
    if (!targetInstanceId) {
      console.log("usage: tradfri toggle INSTANCE_ID");
      process.exit(1);
    }
    const targetDevice = allDevices.find(
      (d) => d.instanceId == targetInstanceId
    );
    await targetDevice.plugList[0].toggle();
  } else if (command === "turn-on") {
    const targetInstanceId = process.argv[3];
    if (!targetInstanceId) {
      console.log("usage: tradfri turn-on INSTANCE_ID");
      process.exit(1);
    }
    const targetDevice = allDevices.find(
      (d) => d.instanceId == targetInstanceId
    );
    await targetDevice.plugList[0].turnOn();
  } else if (command === "turn-off") {
    const targetInstanceId = process.argv[3];
    if (!targetInstanceId) {
      console.log("usage: tradfri turn-off INSTANCE_ID");
      process.exit(1);
    }
    const targetDevice = allDevices.find(
      (d) => d.instanceId == targetInstanceId
    );
    await targetDevice.plugList[0].turnOff();
  } else {
    console.log("usage: tradfri COMMAND");
    process.exit(1);
  }
} finally {
  tradfri.destroy();
}
