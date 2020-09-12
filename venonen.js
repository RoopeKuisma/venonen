// Settings
const doubleClickFilterTimeout = 100 // in ms
const mouseSensitivityDivider = 6000 // The bigger, the slower
const forwardAndBackwardButtonPower = 0.3 // Between 0 and 0.5

const { spawn } = require("child_process");
const Gpio = require('pigpio').Gpio;
const motor = new Gpio(14, {mode: Gpio.OUTPUT});
motor.servoWrite(1500);
const mouseProcess = spawn("stdbuf", ["-oL","-eL","bash", "-c", "cat /dev/input/mouse0 | od -t x1 -w3"])
const kbProcess = spawn("stdbuf", ["-oL","-eL","bash", "-c", "cat /dev/input/event0 | od -t x1 -w3"])

let doubleClickFilterActive = false;
let power = 0 // Between -0.5 and 0.5

const setPower = (value) => {
	power = value
	motor.servoWrite(parseInt(1500+power*1000))
}

const mouseMove = (relative) => {
	let newPower = power += relative/mouseSensitivityDivider
	if (newPower > 0.5) newPower = 0.5
	else if (power < -0.5) newPower = -0.5
	setPower(newPower)
}

mouseProcess.stdout.on("data",(data) => {
	const msgs = data.toString().split(" ");
	if (!msgs[3]) return;
        else if (msgs[1] === "09") setPower(0)
	else {
		let relativeY = parseInt("0x"+msgs[3])
		if (relativeY > 128) relativeY = relativeY-256
		mouseMove(relativeY)
	}
})

kbProcess.stdout.on("data",(data) => {
	const msgs = data.toString().split("\n")
	if (!msgs[4] || doubleClickFilterActive) return;
	else {
		if (msgs[4].includes("4f 00 07")) power === 0 ? setPower(forwardAndBackwardButtonPower) : setPower(0)
		else if (msgs[4].includes("50 00 07")) power === 0 ? setPower(-forwardAndBackwardButtonPower) : setPower(0)
		doubleClickFilterActive = true;
		setTimeout(() => { doubleClickFilterActive = false }, doubleClickFilterTimeout)
	}
})

