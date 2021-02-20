import {
  discoverGateway,
  TradfriClient,
  AccessoryTypes,
} from "node-tradfri-client";
import dotenv from "dotenv";

dotenv.config();
const discovered = await discoverGateway(false);

const sleepMs = (millis) =>
  new Promise((resolve) => setTimeout(resolve, millis));

const tradfri = new TradfriClient(discovered.host);
try {
  const { identity, psk } = await tradfri.authenticate(
    process.env.SECURITY_CODE
  );
  await tradfri.connect(identity, psk);

  const allDevices = [];
  await tradfri
    .on("device updated", (device) => allDevices.push(device))
    .on("error", (error) =>
      console.log("tradfri error=" + JSON.stringify(error, null, 4))
    )
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
  } else if (command === "turn-on-all") {
    const allPlugDevices = allDevices.filter(
      (device) => device.type == AccessoryTypes.plug
    );
    for (const plug of allPlugDevices) {
      await plug.plugList[0].turnOn();
    }
  } else if (command === "turn-off-all") {
    const allPlugDevices = allDevices.filter(
      (device) => device.type == AccessoryTypes.plug
    );
    for (const plug of allPlugDevices) {
      await plug.plugList[0].turnOff();
    }
  } else if (command === "cycle-all") {
    const allPlugDevices = allDevices.filter(
      (device) => device.type == AccessoryTypes.plug
    );
    for (const plug of allPlugDevices) {
      await plug.plugList[0].turnOff();
    }
    let iteration = 0;
    while (true) {
      const currentIdx = iteration % allPlugDevices.length;
      const nextIdx = (iteration + 1) % allPlugDevices.length;
      //await allPlugDevices[currentIdx].plugList[0].turnOff();
      allPlugDevices[currentIdx].plugList[0].onOff = false;
      await tradfri.updateDevice(allPlugDevices[currentIdx]);

      allPlugDevices[nextIdx].plugList[0].onOff = true;
      await tradfri.updateDevice(allPlugDevices[nextIdx]);

      await sleepMs(500);
      iteration += 1;
    }
  } else {
    console.log("usage: tradfri COMMAND");
    process.exit(1);
  }
} finally {
  tradfri.destroy();
}
